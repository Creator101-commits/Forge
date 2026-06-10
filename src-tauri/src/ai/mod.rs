use async_trait::async_trait;
use futures_util::stream::BoxStream;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;
pub mod actions;
pub mod prompt;
pub mod providers;
pub mod registry;

#[derive(Debug, Error)]
pub enum AiError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("API error: {0}")]
    Api(String),
    #[error("Stream parsing error: {0}")]
    StreamParse(String),
    #[error("Provider error: {0}")]
    Provider(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum ChatRole {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: ChatRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub model: String,
    pub temperature: f32,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ChatDelta {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCaps {
    pub supports_streaming: bool,
    pub supports_system_prompt: bool,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    /// Returns the provider's capabilities.
    fn capabilities(&self) -> ProviderCaps;

    /// Streams a chat response back.
    async fn stream_chat(
        &self,
        request: ChatRequest,
    ) -> Result<BoxStream<'static, Result<ChatDelta, AiError>>, AiError>;

    /// Tests the connection and API key.
    async fn test_connection(&self) -> Result<(), AiError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    struct DummyProvider;

    #[async_trait]
    impl AiProvider for DummyProvider {
        fn capabilities(&self) -> ProviderCaps {
            ProviderCaps {
                supports_streaming: true,
                supports_system_prompt: true,
            }
        }

        async fn stream_chat(
            &self,
            _request: ChatRequest,
        ) -> Result<BoxStream<'static, Result<ChatDelta, AiError>>, AiError> {
            Ok(Box::pin(futures_util::stream::empty()))
        }

        async fn test_connection(&self) -> Result<(), AiError> {
            Ok(())
        }
    }

    #[test]
    fn trait_object_dyn_compat_test_compiles() {
        let provider: Box<dyn AiProvider> = Box::new(DummyProvider);
        assert!(provider.capabilities().supports_streaming);
    }
}
