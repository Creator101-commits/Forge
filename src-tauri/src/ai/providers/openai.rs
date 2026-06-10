use crate::ai::{AiError, AiProvider, ChatDelta, ChatRequest, ChatRole, ProviderCaps};
use async_trait::async_trait;
use eventsource_stream::Eventsource;
use futures_util::stream::{BoxStream, StreamExt};
use serde::{Deserialize, Serialize};

pub struct OpenAIProvider {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_base_url(mut self, url: String) -> Self {
        self.base_url = url;
        self
    }
}

#[derive(Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    stream: bool,
}

#[derive(Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIStreamChunk {
    choices: Vec<OpenAIStreamChoice>,
}

#[derive(Deserialize)]
struct OpenAIStreamChoice {
    delta: OpenAIStreamDelta,
}

#[derive(Deserialize)]
struct OpenAIStreamDelta {
    content: Option<String>,
}

#[async_trait]
impl AiProvider for OpenAIProvider {
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
            messages.push(OpenAIMessage {
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
            messages.push(OpenAIMessage {
                role: role.to_string(),
                content: msg.content,
            });
        }

        let openai_req = OpenAIChatRequest {
            model: request.model,
            messages,
            temperature: request.temperature,
            stream: true,
        };

        let response = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&openai_req)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AiError::Api(error_text));
        }

        let stream = response
            .bytes_stream()
            .eventsource()
            .map(|event_result| match event_result {
                Ok(event) => {
                    let data = event.data;
                    if data == "[DONE]" {
                        return Ok(None);
                    }
                    match serde_json::from_str::<OpenAIStreamChunk>(&data) {
                        Ok(chunk) => {
                            if let Some(choice) = chunk.choices.first() {
                                if let Some(content) = &choice.delta.content {
                                    return Ok(Some(ChatDelta {
                                        content: content.clone(),
                                    }));
                                }
                            }
                            Ok(Some(ChatDelta {
                                content: String::new(),
                            }))
                        }
                        Err(e) => Err(AiError::StreamParse(e.to_string())),
                    }
                }
                Err(e) => Err(AiError::StreamParse(e.to_string())),
            })
            // Filter out empty deltas and the [DONE] marker
            .filter_map(|res| async {
                match res {
                    Ok(Some(delta)) => {
                        if delta.content.is_empty() {
                            None
                        } else {
                            Some(Ok(delta))
                        }
                    }
                    Ok(None) => None,
                    Err(e) => Some(Err(e)),
                }
            })
            .boxed();

        Ok(stream)
    }

    async fn test_connection(&self) -> Result<(), AiError> {
        let response = self
            .client
            .get(format!("{}/models", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
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
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_openai_stream() {
        let mock_server = MockServer::start().await;

        let sse_body = "\
data: {\"id\":\"1\",\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"\"}}]}\n\
\n\
data: {\"id\":\"1\",\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\
\n\
data: {\"id\":\"1\",\"choices\":[{\"delta\":{\"content\":\" world\"}}]}\n\
\n\
data: [DONE]\n\
\n\
";

        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(header("Authorization", "Bearer test-key"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(sse_body)
                    .insert_header("content-type", "text/event-stream"),
            )
            .mount(&mock_server)
            .await;

        let provider = OpenAIProvider::new("test-key".to_string()).with_base_url(mock_server.uri());

        let req = ChatRequest {
            messages: vec![crate::ai::ChatMessage {
                role: crate::ai::ChatRole::User,
                content: "Hi".to_string(),
            }],
            model: "gpt-4o".to_string(),
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
