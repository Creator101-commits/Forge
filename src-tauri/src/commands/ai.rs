//! AI commands. Thin shims over the AI provider registry + secrets + streaming.
//!
//! API keys are stored in the OS keychain; the frontend only ever sees redacted
//! previews. Streaming chat emits Tauri events `ai://delta`, `ai://done`,
//! and `ai://action`.

use crate::ai::actions::{ActionRecord, ActionStatus, AiAction};
use crate::ai::registry::DynAiProvider;
use crate::ai::{ChatRequest, ProviderCaps};
use crate::app_state::AppState;
use crate::errors::{ForgeError, Result};
use crate::filesystem as fs;
use crate::project_store as store;
use crate::secrets::{self, Secret};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

// ── Response types (never leak plaintext keys) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderInfo {
    pub id: String,
    pub name: String,
    pub capabilities: ProviderCaps,
    pub is_configured: bool,
    /// Redacted preview of the API key, e.g. "sk-...abcd". None if not set.
    pub key_preview: Option<String>,
    pub models: Vec<String>,
}

/// Standard model lists per provider family. These are reasonable defaults
/// that users can override.
fn default_models_for(provider_id: &str) -> Vec<String> {
    match provider_id {
        "openai" => vec!["gpt-4o".into(), "gpt-4o-mini".into(), "gpt-4-turbo".into()],
        "anthropic" => vec![
            "claude-sonnet-4-20250514".into(),
            "claude-3-5-haiku-20241022".into(),
        ],
        "ollama" => vec!["llama3.2".into(), "codellama".into()],
        "openai-compat" => vec!["default".into()],
        _ => vec!["default".into()],
    }
}

// ── Secret helpers ──

fn secret_for(provider_id: &str) -> Secret {
    Secret {
        service: "forge.ai".into(),
        key: provider_id.to_string(),
    }
}

fn active_root(state: &AppState) -> Result<PathBuf> {
    state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project".into()))
}

// ── Backup helpers ──

/// Path to the backup store under the project root.
fn backups_dir(root: &std::path::Path) -> PathBuf {
    root.join(".forge-backups")
}

/// Save a backup of a file before an AI action modifies it.
fn backup_before_action(root: &std::path::Path, action_id: &str, path: &str) -> Result<()> {
    let dir = backups_dir(root).join(action_id);
    std::fs::create_dir_all(&dir)?;

    // Try reading the current file content.
    let original = match fs::read_file(root, path) {
        Ok(content) => Some(content),
        Err(ForgeError::NotFound(_)) => None,
        Err(e) => return Err(e),
    };

    // Write backup metadata JSON.
    let backup = serde_json::json!({
        "action_id": action_id,
        "path": path,
        "original_content": original,
    });
    std::fs::write(
        dir.join("backup.json"),
        serde_json::to_string_pretty(&backup)?,
    )?;

    Ok(())
}

/// Restore a file from backup and clean up the backup directory.
fn restore_from_backup(root: &std::path::Path, action_id: &str) -> Result<()> {
    let dir = backups_dir(root).join(action_id);
    let backup_path = dir.join("backup.json");

    if !backup_path.exists() {
        return Err(ForgeError::NotFound(format!(
            "no backup found for action '{action_id}'"
        )));
    }

    let raw = std::fs::read_to_string(&backup_path)?;
    let backup: serde_json::Value = serde_json::from_str(&raw)?;

    let file_path = backup["path"]
        .as_str()
        .ok_or_else(|| ForgeError::Internal("backup missing path field".into()))?;

    match backup["original_content"].as_str() {
        Some(original) => {
            fs::write_file(root, file_path, original)?;
        }
        None => {
            // File didn't exist before the action, so delete it now.
            let _ = fs::delete_path(root, file_path);
        }
    }

    // Clean up the backup directory.
    let _ = std::fs::remove_dir_all(&dir);

    Ok(())
}

// ── Pure implementations (testable without Tauri) ──

pub fn list_providers_impl(_state: &AppState) -> Vec<AiProviderInfo> {
    let known: Vec<(&str, &str)> = vec![
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("ollama", "Ollama (local)"),
        ("openai-compat", "OpenAI-Compatible"),
    ];

    known
        .into_iter()
        .map(|(id, name)| {
            let meta = secrets::meta(&secret_for(id)).ok();
            AiProviderInfo {
                id: id.to_string(),
                name: name.to_string(),
                capabilities: ProviderCaps {
                    supports_streaming: true,
                    supports_system_prompt: true,
                },
                is_configured: meta.as_ref().map(|m| m.set).unwrap_or(false),
                key_preview: meta.and_then(|m| m.preview),
                models: default_models_for(id),
            }
        })
        .collect()
}

pub async fn set_provider_impl(
    state: &AppState,
    provider_id: &str,
    api_key: &str,
    base_url: Option<&str>,
) -> Result<AiProviderInfo> {
    // Persist the API key to the OS keychain.
    secrets::set(&secret_for(provider_id), api_key)?;

    // Build the provider and store in the registry.
    let provider: DynAiProvider = match provider_id {
        "openai" => {
            let mut p = crate::ai::providers::openai::OpenAIProvider::new(api_key.to_string());
            if let Some(url) = base_url {
                p = p.with_base_url(url.to_string());
            }
            std::sync::Arc::new(p)
        }
        "anthropic" => {
            let mut p =
                crate::ai::providers::anthropic::AnthropicProvider::new(api_key.to_string());
            if let Some(url) = base_url {
                p = p.with_base_url(url.to_string());
            }
            std::sync::Arc::new(p)
        }
        "ollama" => {
            let mut p = crate::ai::providers::ollama::OllamaProvider::new();
            if let Some(url) = base_url {
                p = p.with_base_url(url.to_string());
            }
            std::sync::Arc::new(p)
        }
        "openai-compat" => {
            let url = base_url
                .ok_or_else(|| {
                    ForgeError::InvalidArgument(
                        "base_url required for openai-compat provider".into(),
                    )
                })?
                .to_string();
            std::sync::Arc::new(
                crate::ai::providers::openai_compat::OpenAICompatProvider::new(
                    api_key.to_string(),
                    url,
                ),
            )
        }
        other => {
            return Err(ForgeError::InvalidArgument(format!(
                "unknown provider '{other}'"
            )))
        }
    };

    state.ai_registry.set_provider(provider_id, provider).await;

    let meta = secrets::meta(&secret_for(provider_id)).ok();
    Ok(AiProviderInfo {
        id: provider_id.to_string(),
        name: provider_id.to_string(),
        capabilities: ProviderCaps {
            supports_streaming: true,
            supports_system_prompt: true,
        },
        is_configured: true,
        key_preview: meta.and_then(|m| m.preview),
        models: default_models_for(provider_id),
    })
}

pub async fn test_connection_impl(state: &AppState, provider_id: &str) -> Result<()> {
    let provider = state
        .ai_registry
        .get_provider(provider_id)
        .await
        .ok_or_else(|| ForgeError::NotFound(format!("provider '{provider_id}' not configured")))?;

    provider
        .test_connection()
        .await
        .map_err(|e| ForgeError::Internal(format!("connection test failed: {e}")))?;

    Ok(())
}

/// Streaming chat helper: spawns a Tokio task that reads from the provider
/// stream and emits Tauri events. Returns immediately.
pub async fn chat_impl(
    app: AppHandle,
    state: &AppState,
    provider_id: &str,
    request: ChatRequest,
) -> Result<()> {
    use futures_util::StreamExt;

    let provider = state
        .ai_registry
        .get_provider(provider_id)
        .await
        .ok_or_else(|| ForgeError::NotFound(format!("provider '{provider_id}' not configured")))?;

    let mut stream = provider
        .stream_chat(request)
        .await
        .map_err(|e| ForgeError::Internal(format!("chat request failed: {e}")))?;

    // Spawn a task to stream deltas back to the frontend.
    tauri::async_runtime::spawn(async move {
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(delta) => {
                    let _ = app.emit("ai://delta", &delta);
                }
                Err(e) => {
                    let _ = app.emit(
                        "ai://error",
                        &serde_json::json!({ "message": e.to_string() }),
                    );
                    return;
                }
            }
        }
        let _ = app.emit("ai://done", &serde_json::json!({}));
    });

    Ok(())
}

/// Apply an AI action to the project filesystem. Takes a snapshot before
/// modifying and logs to event_log BEFORE the file operation so the action
/// is always recorded, even if the file op fails mid-way.
pub fn apply_patch_impl(state: &AppState, action: AiAction) -> Result<ActionRecord> {
    let root = active_root(state)?;

    // Validate the action first.
    crate::ai::actions::validate_action(&action).map_err(ForgeError::InvalidArgument)?;

    let action_id = uuid::Uuid::new_v4().to_string();
    let path = action.target_path().to_string();

    // Snapshot the file before modifying.
    backup_before_action(&root, &action_id, &path)?;

    // Log to event log BEFORE modifying the file.
    let description = action.describe();
    store::append_event_at(
        &root,
        "ai.action.applied",
        &serde_json::json!({
            "action_id": action_id,
            "action": &action,
            "description": description,
        }),
    )?;

    // Apply the action.
    match &action {
        AiAction::CreateFile { path, content } => {
            fs::write_file(&root, path, content)?;
        }
        AiAction::UpdateFile { path, content } => {
            fs::write_file(&root, path, content)?;
        }
        AiAction::DeleteFile { path } => {
            fs::delete_path(&root, path)?;
        }
        AiAction::PatchRange {
            path,
            start_line,
            end_line,
            replacement,
        } => {
            let existing = fs::read_file(&root, path)?;
            let lines: Vec<&str> = existing.lines().collect();
            let start = (*start_line as usize).saturating_sub(1);
            let end = (*end_line as usize).min(lines.len());

            let mut new_content = String::new();
            for line in lines.iter().take(start) {
                new_content.push_str(line);
                new_content.push('\n');
            }
            new_content.push_str(replacement);
            new_content.push('\n');
            for line in lines.iter().skip(end) {
                new_content.push_str(line);
                new_content.push('\n');
            }

            fs::write_file(&root, path, &new_content)?;
        }
        AiAction::InsertBefore {
            path,
            line,
            content,
        } => {
            let existing = fs::read_file(&root, path)?;
            let lines: Vec<&str> = existing.lines().collect();
            let insert_at = (*line as usize).saturating_sub(1).min(lines.len());

            let mut new_content = String::new();
            for line in lines.iter().take(insert_at) {
                new_content.push_str(line);
                new_content.push('\n');
            }
            new_content.push_str(content);
            new_content.push('\n');
            for line in lines.iter().skip(insert_at) {
                new_content.push_str(line);
                new_content.push('\n');
            }

            fs::write_file(&root, path, &new_content)?;
        }
    }

    Ok(ActionRecord {
        id: action_id,
        action,
        status: ActionStatus::Applied,
        description,
    })
}

/// Revert an applied AI action by restoring the file from the pre-action
/// snapshot.
pub fn revert_patch_impl(state: &AppState, action_id: &str) -> Result<()> {
    let root = active_root(state)?;

    // Restore from backup.
    restore_from_backup(&root, action_id)?;

    // Log the revert.
    let _ = store::append_event_at(
        &root,
        "ai.action.reverted",
        &serde_json::json!({ "action_id": action_id }),
    );

    Ok(())
}

/// Preview a patch action diff without applying it. Returns a unified diff
/// string showing the changes.
pub fn preview_patch_impl(state: &AppState, action: &AiAction) -> Result<String> {
    let root = active_root(state)?;

    match action {
        AiAction::PatchRange {
            path,
            start_line,
            end_line,
            replacement,
        } => {
            let existing = fs::read_file(&root, path)?;
            let diff = crate::ai::actions::preview_patch(&existing, *start_line, *end_line, replacement);
            Ok(diff)
        }
        AiAction::InsertBefore { path, line, content } => {
            let existing = fs::read_file(&root, path)?;
            let diff = crate::ai::actions::preview_patch(&existing, *line, *line + 1, content);
            Ok(diff)
        }
        AiAction::UpdateFile { path, content } => {
            let existing = fs::read_file(&root, path).unwrap_or_default();
            let diff = crate::ai::actions::preview_patch(&existing, 0, 0, content);
            Ok(diff)
        }
        AiAction::CreateFile { path, content } => {
            let _existing = String::new();
            let diff = format!("+ (new file) {path}\n{content}");
            Ok(diff)
        }
        AiAction::DeleteFile { path } => {
            let existing = fs::read_file(&root, path).unwrap_or_default();
            let diff = format!("- (delete) {path}\n{existing}");
            Ok(diff)
        }
    }
}

/// Reject an AI action (proposed but not applied). Logs to event_log.
pub fn reject_action_impl(state: &AppState, action_id: &str, reason: &str) -> Result<()> {
    let root = active_root(state)?;

    let _ = store::append_event_at(
        &root,
        "ai.action.rejected",
        &serde_json::json!({
            "action_id": action_id,
            "reason": reason,
        }),
    );

    Ok(())
}

// ── Tauri commands ──

#[tauri::command]
pub fn ai_list_providers(state: State<'_, AppState>) -> Vec<AiProviderInfo> {
    list_providers_impl(&state)
}

#[tauri::command]
pub async fn ai_set_provider(
    state: State<'_, AppState>,
    provider_id: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<AiProviderInfo> {
    set_provider_impl(&state, &provider_id, &api_key, base_url.as_deref()).await
}

#[tauri::command]
pub async fn ai_test_connection(state: State<'_, AppState>, provider_id: String) -> Result<()> {
    test_connection_impl(&state, &provider_id).await
}

#[tauri::command]
pub async fn ai_chat(
    app: AppHandle,
    state: State<'_, AppState>,
    provider_id: String,
    request: ChatRequest,
) -> Result<()> {
    chat_impl(app, &state, &provider_id, request).await
}

#[tauri::command]
pub fn ai_apply_patch(state: State<'_, AppState>, action: AiAction) -> Result<ActionRecord> {
    apply_patch_impl(&state, action)
}

#[tauri::command]
pub fn ai_revert_patch(state: State<'_, AppState>, action_id: String) -> Result<()> {
    revert_patch_impl(&state, &action_id)
}

#[tauri::command]
pub fn ai_preview_patch(state: State<'_, AppState>, action: AiAction) -> Result<String> {
    preview_patch_impl(&state, &action)
}

#[tauri::command]
pub fn ai_reject_action(
    state: State<'_, AppState>,
    action_id: String,
    reason: Option<String>,
) -> Result<()> {
    reject_action_impl(&state, &action_id, &reason.unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_store;
    use std::path::Path;
    use tempfile::tempdir;

    fn state_with_project(dir: &Path) -> (AppState, PathBuf) {
        let state = AppState::new(dir.join("forge-user.db"));
        let root = dir.join("proj");
        let project = project_store::create_project(&root, "AI Test").unwrap();
        state.set_active(&root, project);
        (state, root)
    }

    // ── Provider list tests ──

    #[test]
    fn list_providers_returns_all_four() {
        let tmp = tempdir().unwrap();
        let state = AppState::new(tmp.path().join("forge-user.db"));
        let providers = list_providers_impl(&state);
        assert_eq!(providers.len(), 4);
        assert!(providers.iter().any(|p| p.id == "openai"));
        assert!(providers.iter().any(|p| p.id == "anthropic"));
    }

    #[test]
    fn test_connection_requires_provider_setup() {
        let tmp = tempdir().unwrap();
        let state = AppState::new(tmp.path().join("forge-user.db"));
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(test_connection_impl(&state, "openai"));
        assert!(result.is_err());
    }

    // ── Apply tests ──

    #[test]
    fn apply_create_file_and_read_back() {
        let tmp = tempdir().unwrap();
        let (state, _root) = state_with_project(tmp.path());

        let action = AiAction::CreateFile {
            path: "src/new_file.ino".into(),
            content: "void setup() {}".into(),
        };

        let record = apply_patch_impl(&state, action).unwrap();
        assert_eq!(record.status, ActionStatus::Applied);
        assert!(record.description.contains("src/new_file.ino"));

        let root = state.active_root().unwrap();
        let content = fs::read_file(&root, "src/new_file.ino").unwrap();
        assert_eq!(content, "void setup() {}");
    }

    #[test]
    fn apply_update_file() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        fs::write_file(&root, "src/main.ino", "old content").unwrap();

        let action = AiAction::UpdateFile {
            path: "src/main.ino".into(),
            content: "new content".into(),
        };

        apply_patch_impl(&state, action).unwrap();
        assert_eq!(fs::read_file(&root, "src/main.ino").unwrap(), "new content");
    }

    #[test]
    fn apply_delete_file() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        fs::write_file(&root, "src/temp.ino", "delete me").unwrap();
        let action = AiAction::DeleteFile {
            path: "src/temp.ino".into(),
        };

        apply_patch_impl(&state, action).unwrap();
        assert!(fs::read_file(&root, "src/temp.ino").is_err());
    }

    #[test]
    fn apply_patch_range() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        let original = "line1\nline2\nline3\nline4\nline5\n";
        fs::write_file(&root, "src/main.ino", original).unwrap();

        let action = AiAction::PatchRange {
            path: "src/main.ino".into(),
            start_line: 2,
            end_line: 4,
            replacement: "new line 2\nnew line 3\nnew line 4".into(),
        };

        apply_patch_impl(&state, action).unwrap();

        let result = fs::read_file(&root, "src/main.ino").unwrap();
        assert!(result.contains("line1"));
        assert!(result.contains("new line 2"));
        assert!(result.contains("new line 4"));
        assert!(result.contains("line5"));
        assert!(!result.contains("line2"));
        assert!(!result.contains("line3"));
        assert!(!result.contains("line4"));
    }

    #[test]
    fn apply_insert_before() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        let original = "line1\nline2\nline3\n";
        fs::write_file(&root, "src/main.ino", original).unwrap();

        let action = AiAction::InsertBefore {
            path: "src/main.ino".into(),
            line: 2,
            content: "inserted".into(),
        };

        apply_patch_impl(&state, action).unwrap();

        let result = fs::read_file(&root, "src/main.ino").unwrap();
        let lines: Vec<&str> = result.lines().collect();
        assert_eq!(lines[0], "line1");
        assert_eq!(lines[1], "inserted");
        assert_eq!(lines[2], "line2");
        assert_eq!(lines[3], "line3");
    }

    #[test]
    fn apply_rejects_path_traversal() {
        let tmp = tempdir().unwrap();
        let (state, _root) = state_with_project(tmp.path());

        let action = AiAction::CreateFile {
            path: "../escape.txt".into(),
            content: "bad".into(),
        };
        assert!(apply_patch_impl(&state, action).is_err());
    }

    // ── Revert tests ──

    #[test]
    fn revert_restores_file_to_original() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        let original = "original content here\n";
        fs::write_file(&root, "src/main.ino", original).unwrap();

        let action = AiAction::UpdateFile {
            path: "src/main.ino".into(),
            content: "modified by AI".into(),
        };

        let record = apply_patch_impl(&state, action).unwrap();
        assert_eq!(
            fs::read_file(&root, "src/main.ino").unwrap(),
            "modified by AI"
        );

        revert_patch_impl(&state, &record.id).unwrap();
        assert_eq!(fs::read_file(&root, "src/main.ino").unwrap(), original);

        // Backup directory should be cleaned up.
        let backup_dir = backups_dir(&root).join(&record.id);
        assert!(!backup_dir.exists());
    }

    #[test]
    fn revert_delete_restores_file() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        fs::write_file(&root, "src/temp.ino", "restore me").unwrap();

        let action = AiAction::DeleteFile {
            path: "src/temp.ino".into(),
        };
        let record = apply_patch_impl(&state, action).unwrap();

        assert!(fs::read_file(&root, "src/temp.ino").is_err());

        revert_patch_impl(&state, &record.id).unwrap();
        assert_eq!(fs::read_file(&root, "src/temp.ino").unwrap(), "restore me");
    }

    #[test]
    fn revert_create_file_removes_it() {
        let tmp = tempdir().unwrap();
        let (state, root) = state_with_project(tmp.path());

        // File does not exist before the action.
        assert!(fs::read_file(&root, "src/ai_gen.ino").is_err());

        let action = AiAction::CreateFile {
            path: "src/ai_gen.ino".into(),
            content: "generated by AI".into(),
        };
        let record = apply_patch_impl(&state, action).unwrap();

        assert!(fs::read_file(&root, "src/ai_gen.ino").is_ok());

        revert_patch_impl(&state, &record.id).unwrap();

        // After revert, the file should no longer exist since it was created by AI.
        assert!(fs::read_file(&root, "src/ai_gen.ino").is_err());
    }

    #[test]
    fn revert_unknown_action_returns_not_found() {
        let tmp = tempdir().unwrap();
        let (state, _root) = state_with_project(tmp.path());

        let result = revert_patch_impl(&state, "nonexistent-id");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code(), "not_found");
    }
}
