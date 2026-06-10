use crate::ai::{AiError, AiProvider, ChatDelta, ChatRequest, ChatRole, ProviderCaps};
use async_trait::async_trait;
use eventsource_stream::Eventsource;
use futures_util::stream::{BoxStream, StreamExt};
use serde::{Deserialize, Serialize};

pub struct AnthropicProvider {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            base_url: "https://api.anthropic.com/v1".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_base_url(mut self, url: String) -> Self {
        self.base_url = url;
        self
    }
}

#[derive(Serialize)]
struct AnthropicChatRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: u32,
    system: Option<String>,
    temperature: f32,
    stream: bool,
}

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicStreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    delta: Option<AnthropicStreamDelta>,
}

#[derive(Deserialize)]
struct AnthropicStreamDelta {
    #[serde(rename = "type")]
    #[allow(dead_code)]
    delta_type: Option<String>,
    text: Option<String>,
}

#[async_trait]
impl AiProvider for AnthropicProvider {
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

        for msg in request.messages {
            // Anthropic doesn't allow 'system' in the messages array, it goes in the top-level 'system' field.
            if let ChatRole::System = msg.role {
                continue;
            }
            let role = match msg.role {
                ChatRole::User => "user",
                ChatRole::Assistant => "assistant",
                _ => "user", // fallback
            };
            messages.push(AnthropicMessage {
                role: role.to_string(),
                content: msg.content,
            });
        }

        let anthropic_req = AnthropicChatRequest {
            model: request.model,
            messages,
            max_tokens: 4096, // required field for anthropic
            system: request.system_prompt,
            temperature: request.temperature,
            stream: true,
        };

        let response = self
            .client
            .post(format!("{}/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&anthropic_req)
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
                    match serde_json::from_str::<AnthropicStreamEvent>(&data) {
                        Ok(event_obj) => {
                            if event_obj.event_type == "content_block_delta" {
                                if let Some(delta) = event_obj.delta {
                                    if let Some(text) = delta.text {
                                        return Ok(Some(ChatDelta { content: text }));
                                    }
                                }
                            }
                            // other event types (message_start, content_block_start, etc) yield empty content
                            Ok(Some(ChatDelta {
                                content: String::new(),
                            }))
                        }
                        Err(e) => Err(AiError::StreamParse(e.to_string())),
                    }
                }
                Err(e) => Err(AiError::StreamParse(e.to_string())),
            })
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
        // Anthropic doesn't have a simple /models endpoint, so we do a tiny generation request
        let req = AnthropicChatRequest {
            model: "claude-3-haiku-20240307".to_string(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "ping".to_string(),
            }],
            max_tokens: 1,
            system: None,
            temperature: 0.0,
            stream: false,
        };

        let response = self
            .client
            .post(format!("{}/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&req)
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
    async fn test_anthropic_stream() {
        let mock_server = MockServer::start().await;

        let sse_body = "\
event: message_start
data: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"type\":\"message\",\"role\":\"assistant\",\"content\":[],\"model\":\"claude-3-haiku-20240307\",\"stop_reason\":null,\"stop_sequence\":null,\"usage\":{\"input_tokens\":10,\"output_tokens\":1}}}

event: content_block_start
data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"Hello\"}}

event: content_block_delta
data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\" world\"}}

event: content_block_stop
data: {\"type\":\"content_block_stop\",\"index\":0}

event: message_delta
data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\",\"stop_sequence\":null},\"usage\":{\"output_tokens\":2}}

event: message_stop
data: {\"type\":\"message_stop\"}
";

        Mock::given(method("POST"))
            .and(path("/messages"))
            .and(header("x-api-key", "test-key"))
            .and(header("anthropic-version", "2023-06-01"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(sse_body)
                    .insert_header("content-type", "text/event-stream"),
            )
            .mount(&mock_server)
            .await;

        let provider = AnthropicProvider::new("test-key".to_string())
            .with_base_url(mock_server.uri());

        let req = ChatRequest {
            messages: vec![crate::ai::ChatMessage {
                role: ChatRole::User,
                content: "Hi".to_string(),
            }],
            model: "claude-3-haiku-20240307".to_string(),
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
