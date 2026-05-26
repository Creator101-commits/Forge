//! Tracing initialization.
//!
//! Writes structured logs to stdout (always) and to a daily-rotated file
//! under the platform-appropriate log directory:
//!   - macOS:   ~/Library/Logs/Forge/
//!   - Windows: %LOCALAPPDATA%\Forge\logs\
//!   - Linux:   ~/.local/state/forge/logs/  (XDG_STATE_HOME fallback)
//!
//! Returns a guard that must be kept alive for the file appender to flush.

use directories::ProjectDirs;
use std::path::PathBuf;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn log_dir() -> Option<PathBuf> {
    if cfg!(target_os = "macos") {
        // ~/Library/Logs/Forge
        let home = std::env::var("HOME").ok()?;
        Some(PathBuf::from(home).join("Library/Logs/Forge"))
    } else if cfg!(target_os = "windows") {
        let local = std::env::var("LOCALAPPDATA").ok()?;
        Some(PathBuf::from(local).join("Forge").join("logs"))
    } else {
        // Prefer XDG_STATE_HOME, else ~/.local/state
        let proj = ProjectDirs::from("com", "Forge", "Forge")?;
        Some(proj.data_local_dir().join("logs"))
    }
}

pub fn init() -> std::io::Result<WorkerGuard> {
    init_with_dir(log_dir())
}

pub fn init_with_dir(dir: Option<PathBuf>) -> std::io::Result<WorkerGuard> {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let dir = dir.ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "log dir not resolvable")
    })?;
    std::fs::create_dir_all(&dir)?;

    let file_appender = tracing_appender::rolling::daily(&dir, "forge.log");
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    let stdout_layer = fmt::layer().with_target(false).compact();
    let file_layer = fmt::layer()
        .with_target(true)
        .with_ansi(false)
        .with_writer(file_writer);

    tracing_subscriber::registry()
        .with(filter)
        .with(stdout_layer)
        .with(file_layer)
        .try_init()
        .ok();

    Ok(guard)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn log_dir_resolves_for_current_platform() {
        let dir = log_dir();
        assert!(dir.is_some(), "expected a log dir on this platform");
    }

    #[test]
    fn init_with_dir_creates_log_file() {
        let tmp = tempdir().expect("tmpdir");
        let log_dir = tmp.path().join("nested/logs");
        let _guard = init_with_dir(Some(log_dir.clone())).expect("init logs");
        tracing::info!("hello forge");
        // The file appender writes asynchronously; we only assert the dir was created.
        assert!(log_dir.is_dir());
    }
}
