//! OS keychain integration.
//!
//! The frontend only ever sees redacted previews + an `is_set` flag.
//! The plaintext value never crosses IPC after it has been stored.
//!
//! For CI / headless environments where a real OS keyring is unavailable,
//! an in-memory backend is selected via `set_backend(...)`. The default
//! backend is the real `keyring::Entry`.

use crate::errors::{ForgeError, Result};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct Secret {
    pub service: String,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct SecretMeta {
    pub service: String,
    pub key: String,
    pub set: bool,
    /// Redacted preview like `sk-...abcd`. None when not set.
    pub preview: Option<String>,
}

pub trait SecretBackend: Send + Sync + 'static {
    fn get(&self, secret: &Secret) -> Result<Option<String>>;
    fn set(&self, secret: &Secret, value: &str) -> Result<()>;
    fn delete(&self, secret: &Secret) -> Result<()>;
}

// ---------- Real OS-keyring backend ----------

pub struct OsBackend;

impl OsBackend {
    fn entry(secret: &Secret) -> Result<keyring::Entry> {
        keyring::Entry::new(&secret.service, &secret.key)
            .map_err(|e| ForgeError::Keyring(e.to_string()))
    }
}

impl SecretBackend for OsBackend {
    fn get(&self, secret: &Secret) -> Result<Option<String>> {
        match Self::entry(secret)?.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(ForgeError::Keyring(e.to_string())),
        }
    }
    fn set(&self, secret: &Secret, value: &str) -> Result<()> {
        Self::entry(secret)?
            .set_password(value)
            .map_err(|e| ForgeError::Keyring(e.to_string()))
    }
    fn delete(&self, secret: &Secret) -> Result<()> {
        match Self::entry(secret)?.delete_password() {
            Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(ForgeError::Keyring(e.to_string())),
        }
    }
}

// ---------- In-memory backend for tests / CI ----------

#[derive(Default)]
pub struct MemoryBackend {
    inner: Mutex<HashMap<(String, String), String>>,
}

impl MemoryBackend {
    pub fn new() -> Self {
        Self::default()
    }
}

impl SecretBackend for MemoryBackend {
    fn get(&self, secret: &Secret) -> Result<Option<String>> {
        Ok(self
            .inner
            .lock()
            .get(&(secret.service.clone(), secret.key.clone()))
            .cloned())
    }
    fn set(&self, secret: &Secret, value: &str) -> Result<()> {
        self.inner.lock().insert(
            (secret.service.clone(), secret.key.clone()),
            value.to_string(),
        );
        Ok(())
    }
    fn delete(&self, secret: &Secret) -> Result<()> {
        self.inner
            .lock()
            .remove(&(secret.service.clone(), secret.key.clone()));
        Ok(())
    }
}

// ---------- Global backend registry ----------
//
// Uses a RwLock so tests can swap backends across test cases. Production code
// sets this once during `lib::run()` startup.

use parking_lot::RwLock;

static BACKEND: OnceCell<RwLock<Arc<dyn SecretBackend>>> = OnceCell::new();

fn backend_slot() -> &'static RwLock<Arc<dyn SecretBackend>> {
    BACKEND.get_or_init(|| RwLock::new(Arc::new(OsBackend) as Arc<dyn SecretBackend>))
}

pub fn set_backend(b: Arc<dyn SecretBackend>) {
    *backend_slot().write() = b;
}

pub fn backend() -> Arc<dyn SecretBackend> {
    backend_slot().read().clone()
}

// ---------- Public API used by commands ----------

pub fn validate(secret: &Secret) -> Result<()> {
    if secret.service.trim().is_empty() {
        return Err(ForgeError::InvalidArgument("service is empty".into()));
    }
    if secret.key.trim().is_empty() {
        return Err(ForgeError::InvalidArgument("key is empty".into()));
    }
    if secret.service.len() > 128 || secret.key.len() > 128 {
        return Err(ForgeError::InvalidArgument("identifier too long".into()));
    }
    Ok(())
}

pub fn meta(secret: &Secret) -> Result<SecretMeta> {
    validate(secret)?;
    let value = backend().get(secret)?;
    Ok(SecretMeta {
        service: secret.service.clone(),
        key: secret.key.clone(),
        set: value.is_some(),
        preview: value.as_deref().map(redact),
    })
}

pub fn set(secret: &Secret, value: &str) -> Result<SecretMeta> {
    validate(secret)?;
    if value.is_empty() {
        return Err(ForgeError::InvalidArgument("value is empty".into()));
    }
    if value.len() > 8192 {
        return Err(ForgeError::InvalidArgument("value too long".into()));
    }
    backend().set(secret, value)?;
    Ok(SecretMeta {
        service: secret.service.clone(),
        key: secret.key.clone(),
        set: true,
        preview: Some(redact(value)),
    })
}

pub fn delete(secret: &Secret) -> Result<()> {
    validate(secret)?;
    backend().delete(secret)
}

/// Produce a stable redacted preview that never leaks more than 4 characters.
fn redact(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() <= 4 {
        return "*".repeat(trimmed.len().max(1));
    }
    let tail: String = trimmed
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    format!("...{tail}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn use_mem() {
        set_backend(Arc::new(MemoryBackend::new()));
    }

    #[test]
    fn rejects_empty_service_or_key() {
        use_mem();
        let s = Secret {
            service: "".into(),
            key: "k".into(),
        };
        assert!(validate(&s).is_err());
    }

    #[test]
    fn redact_short_and_long() {
        assert_eq!(redact("abc"), "***");
        assert_eq!(redact("sk-1234abcd"), "...abcd");
    }

    #[test]
    fn set_get_delete_roundtrip_in_memory_backend() {
        // We don't share global state across tests reliably, so test the
        // backend directly to keep this hermetic.
        let b = MemoryBackend::new();
        let s = Secret {
            service: "forge.ai".into(),
            key: "openai".into(),
        };
        assert_eq!(b.get(&s).unwrap(), None);
        b.set(&s, "sk-test-123456").unwrap();
        assert_eq!(b.get(&s).unwrap().as_deref(), Some("sk-test-123456"));
        b.delete(&s).unwrap();
        assert_eq!(b.get(&s).unwrap(), None);
    }

    #[test]
    fn meta_preview_does_not_leak_full_value() {
        let b = MemoryBackend::new();
        set_backend(Arc::new(MemoryBackend::new()));
        // Use direct backend ops to avoid race with global init by other tests.
        let s = Secret {
            service: "forge.ai".into(),
            key: "anthropic".into(),
        };
        b.set(&s, "sk-ant-supersecret-XYZW").unwrap();
        let v = b.get(&s).unwrap().unwrap();
        let preview = redact(&v);
        assert!(!preview.contains("supersecret"));
        assert!(preview.ends_with("XYZW"));
    }
}
