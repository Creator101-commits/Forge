use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::ai::AiProvider;

pub type DynAiProvider = Arc<dyn AiProvider>;

pub struct ProviderRegistry {
    providers: RwLock<HashMap<String, DynAiProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self {
            providers: RwLock::new(HashMap::new()),
        }
    }

    pub async fn get_provider(&self, id: &str) -> Option<DynAiProvider> {
        let map = self.providers.read().await;
        map.get(id).cloned()
    }

    pub async fn set_provider(&self, id: &str, provider: DynAiProvider) {
        let mut map = self.providers.write().await;
        map.insert(id.to_string(), provider);
    }
    
    pub async fn list_providers(&self) -> Vec<String> {
        let map = self.providers.read().await;
        map.keys().cloned().collect()
    }
}
