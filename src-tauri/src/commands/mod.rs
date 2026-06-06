//! Tauri command surface. Each command is a thin shim that delegates to a
//! pure-Rust function so the logic is unit-testable without Tauri runtime.

pub mod boards;
pub mod diagnostics;
pub mod filesystem;
pub mod project;
pub mod search;
pub mod serial;
pub mod settings;

use crate::errors::Result;
use crate::secrets::{self, Secret, SecretMeta};

#[tauri::command]
pub fn ping() -> Result<String> {
    Ok("pong".to_string())
}

#[tauri::command]
pub fn app_version() -> Result<String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
pub fn get_secret_meta(secret: Secret) -> Result<SecretMeta> {
    secrets::meta(&secret)
}

#[tauri::command]
pub fn set_secret(secret: Secret, value: String) -> Result<SecretMeta> {
    secrets::set(&secret, &value)
}

#[tauri::command]
pub fn delete_secret(secret: Secret) -> Result<()> {
    secrets::delete(&secret)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::secrets::{set_backend, MemoryBackend};
    use std::sync::Arc;

    #[test]
    fn ping_returns_pong() {
        assert_eq!(ping().unwrap(), "pong");
    }

    #[test]
    fn app_version_matches_cargo_pkg_version() {
        assert_eq!(app_version().unwrap(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn secret_set_get_delete_via_commands() {
        set_backend(Arc::new(MemoryBackend::new()));
        let s = Secret {
            service: "forge.test".into(),
            key: "cmd-roundtrip".into(),
        };

        let initial = get_secret_meta(s.clone()).unwrap();
        assert!(!initial.set);

        let after_set = set_secret(s.clone(), "sk-abcdEFGH".into()).unwrap();
        assert!(after_set.set);
        assert!(after_set.preview.unwrap().ends_with("EFGH"));

        let after_get = get_secret_meta(s.clone()).unwrap();
        assert!(after_get.set);

        delete_secret(s.clone()).unwrap();
        let after_del = get_secret_meta(s).unwrap();
        assert!(!after_del.set);
    }
}
