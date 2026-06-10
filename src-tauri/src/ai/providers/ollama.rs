use crate::ai::{AiError, AiProvider, ChatDelta, ChatRequest, ChatRole, ProviderCaps};
use async_trait::async_trait;
use futures_util::stream::{BoxStream, StreamExt};
use serde::{Deserialize, Serialize};

pub struct OllamaProvider {
    client: reqwest::Client,
    base_url: String,
}

impl OllamaProvider {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: "http://localhost:11434/api".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_base_url(mut self, url: String) -> Self {
        self.base_url = url;
        self
    }
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OllamaOptions {
    temperature: f32,
}

#[derive(Deserialize)]
struct OllamaStreamResponse {
    message: Option<OllamaMessageResponse>,
    done: bool,
}

#[derive(Deserialize)]
struct OllamaMessageResponse {
    content: String,
}

#[async_trait]
impl AiProvider for OllamaProvider {
    fn capabilities(&self) -> ProviderCaps {
        ProviderCaps {
            supports_streaming: true,
            supports_system_prompt: true,
        }
    }

    async fn stream_chat(
        &self,
        request: ChatRequest,
    ) -> Result<BoxStream<'static, Result<ChatDelta, AiError>>, AiError> {
        let mut messages = Vec::new();

        if let Some(system) = request.system_prompt {
            messages.push(OllamaMessage {
                role: "system".to_string(),
                content: system,
            });
        }

        for msg in request.messages {
            let role = match msg.role {
                ChatRole::System => "system",
                ChatRole::User => "user",
                ChatRole::Assistant => "assistant",
            };
            messages.push(OllamaMessage {
                role: role.to_string(),
                content: msg.content,
            });
        }

        let ollama_req = OllamaChatRequest {
            model: request.model,
            messages,
            stream: true,
            options: OllamaOptions {
                temperature: request.temperature,
            },
        };

        let response = self
            .client
            .post(format!("{}/chat", self.base_url))
            .json(&ollama_req)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::Api(error_text));
        }

        // Ollama sends newline-delimited JSON (NDJSON), not SSE.
        use bytes::BytesMut;
        let mut stream = response.bytes_stream();
        let mut buffer = BytesMut::new();

        let output_stream = async_stream::stream! {
            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(chunk) => {
                        buffer.extend_from_slice(&chunk);
                        // Parse complete lines from the buffer
                        while let Some(newline_pos) = buffer.iter().position(|&b| b == b'\n') {
                            let line = buffer.split_to(newline_pos + 1);
                            let line_str = match std::str::from_utf8(&line) {
                                Ok(s) => s.trim(),
                                Err(e) => {
                                    yield Err(AiError::StreamParse(e.to_string()));
                                    continue;
                                }
                            };

                            if line_str.is_empty() {
                                continue;
                            }

                            match serde_json::from_str::<OllamaStreamResponse>(line_str) {
                                Ok(res) => {
                                    if let Some(msg) = res.message {
                                        if !msg.content.is_empty() {
                                            yield Ok(ChatDelta { content: msg.content });
                                        }
                                    }
                                    if res.done {
                                        // The stream is done, but we don't necessarily exit the loop early
                                        // since we might want to finish processing any remaining buffer,
                                        // though typically `done: true` is the last message.
                                    }
                                }
                                Err(e) => {
                                    yield Err(AiError::StreamParse(e.to_string()));
                                }
                            }
                        }
                    }
                    Err(e) => yield Err(AiError::Network(e)),
                }
            }
            // Check for remaining data without a trailing newline
            if !buffer.is_empty() {
                 let line_str = match std::str::from_utf8(&buffer) {
                    Ok(s) => s.trim(),
                    Err(e) => {
                        yield Err(AiError::StreamParse(e.to_string()));
                        return;
                    }
                };
                if !line_str.is_empty() {
                     match serde_json::from_str::<OllamaStreamResponse>(line_str) {
                        Ok(res) => {
                            if let Some(msg) = res.message {
                                if !msg.content.is_empty() {
                                    yield Ok(ChatDelta { content: msg.content });
                                }
                            }
                        }
                        Err(e) => {
                            yield Err(AiError::StreamParse(e.to_string()));
                        }
                    }
                }
            }
        };

        Ok(output_stream.boxed())
    }

    async fn test_connection(&self) -> Result<(), AiError> {
        let response = self
            .client
            .get(format!("{}/tags", self.base_url))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let err = response.text().await.unwrap_or_default();
            Err(AiError::Api(err))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_ollama_stream() {
        let mock_server = MockServer::start().await;

        let ndjson_body = "\
{\"model\":\"llama3\",\"created_at\":\"2024-06-10T12:00:00Z\",\"message\":{\"role\":\"assistant\",\"content\":\"Hello\"},\"done\":false}
{\"model\":\"llama3\",\"created_at\":\"2024-06-10T12:00:01Z\",\"message\":{\"role\":\"assistant\",\"content\":\" world\"},\"done\":false}
{\"model\":\"llama3\",\"created_at\":\"2024-06-10T12:00:02Z\",\"message\":{\"role\":\"assistant\",\"content\":\"\"},\"done\":true}
";

        Mock::given(method("POST"))
            .and(path("/chat"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(ndjson_body)
                    .insert_header("content-type", "application/x-ndjson"),
            )
            .mount(&mock_server)
            .await;

        let provider = OllamaProvider::new().with_base_url(mock_server.uri());

        let req = ChatRequest {
            messages: vec![crate::ai::ChatMessage {
                role: ChatRole::User,
                content: "Hi".to_string(),
            }],
            model: "llama3".to_string(),
            temperature: 0.7,
            system_prompt: None,
        };

        let mut stream = provider.stream_chat(req).await.unwrap();

        let chunk1 = stream.next().await.unwrap().unwrap();
        assert_eq!(chunk1.content, "Hello");

        let chunk2 = stream.next().await.unwrap().unwrap();
        assert_eq!(chunk2.content, " world");

        assert!(stream.next().await.is_none());
    }
}
