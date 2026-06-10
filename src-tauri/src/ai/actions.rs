//! Action Router: validates and routes structured AI actions.
//!
//! All AI write access goes through this module. Actions are parsed from LLM
//! responses, validated against schemas, and executed through approval-gated
//! mutators. Every applied action is logged to `event_log` for revert support.

use serde::{Deserialize, Serialize};

/// Structured actions the AI can propose. Start with code actions (M3); CAD,
/// circuit, PCB, and BOM actions are added in their respective milestones.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AiAction {
    /// Create a new file with the given content.
    CreateFile { path: String, content: String },
    /// Replace the entire content of an existing file.
    UpdateFile { path: String, content: String },
    /// Delete a file.
    DeleteFile { path: String },
    /// Apply a precise patch to a range of lines in an existing file.
    /// Lines are 1-based and inclusive on both ends.
    PatchRange {
        path: String,
        /// 1-based start line (inclusive).
        start_line: u32,
        /// 1-based end line (inclusive).
        end_line: u32,
        /// Replacement text (may be empty to delete the range).
        replacement: String,
    },
    /// Insert text before the given line number (1-based).
    InsertBefore {
        path: String,
        line: u32,
        content: String,
    },
}

/// The status of an AI action in the lifecycle.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ActionStatus {
    Proposed,
    Previewed,
    Approved,
    Applied,
    Reverted,
    Rejected,
}

/// A tracked action with its lifecycle status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRecord {
    pub id: String,
    pub action: AiAction,
    pub status: ActionStatus,
    pub description: String,
}

impl AiAction {
    /// Human-readable description for the action card in the UI.
    pub fn describe(&self) -> String {
        match self {
            AiAction::CreateFile { path, .. } => format!("Create file: {path}"),
            AiAction::UpdateFile { path, .. } => format!("Update file: {path}"),
            AiAction::DeleteFile { path } => format!("Delete file: {path}"),
            AiAction::PatchRange {
                path,
                start_line,
                end_line,
                ..
            } => {
                format!("Patch {path} lines {start_line}-{end_line}")
            }
            AiAction::InsertBefore { path, line, .. } => {
                format!("Insert before line {line} in {path}")
            }
        }
    }

    /// Returns the file path this action targets.
    pub fn target_path(&self) -> &str {
        match self {
            AiAction::CreateFile { path, .. }
            | AiAction::UpdateFile { path, .. }
            | AiAction::DeleteFile { path }
            | AiAction::PatchRange { path, .. }
            | AiAction::InsertBefore { path, .. } => path,
        }
    }
}

/// Validate an action against basic constraints.
pub fn validate_action(action: &AiAction) -> Result<(), String> {
    let path = action.target_path();

    // Path must not be empty
    if path.trim().is_empty() {
        return Err("file path is empty".into());
    }

    // Path must not try to escape the project root
    if path.contains("..") {
        return Err("file path contains '..' (path traversal rejected)".into());
    }

    // Path must be relative (no leading / or C:\)
    if path.starts_with('/') || (path.len() > 2 && &path[1..2] == ":") {
        return Err("file path must be relative to the project root".into());
    }

    match action {
        AiAction::PatchRange {
            start_line,
            end_line,
            ..
        } => {
            if *end_line < *start_line {
                return Err("end_line must be >= start_line".into());
            }
            if *start_line == 0 {
                return Err("line numbers are 1-based".into());
            }
        }
        AiAction::InsertBefore { line, .. } if *line == 0 => {
            return Err("line numbers are 1-based".into());
        }
        _ => {}
    }

    Ok(())
}

/// Try to parse an AiAction from a JSON string (e.g. extracted from an AI
/// response). Returns the action and any parse error.
pub fn parse_action(json: &str) -> Result<AiAction, String> {
    serde_json::from_str(json).map_err(|e| format!("invalid action JSON: {e}"))
}

/// Compute a unified diff preview for a PatchRange action against existing
/// file content. Returns a human-readable diff string.
pub fn preview_patch(
    existing_content: &str,
    start_line: u32,
    end_line: u32,
    replacement: &str,
) -> String {
    let lines: Vec<&str> = existing_content.lines().collect();

    let start = (start_line.saturating_sub(1)) as usize;
    let end = (end_line as usize).min(lines.len());

    let mut preview = String::new();

    // Context lines before
    let ctx_start = start.saturating_sub(3);
    for i in ctx_start..start {
        if i < lines.len() {
            preview.push_str(&format!("  {:4}  {}\n", i + 1, lines[i]));
        }
    }

    // Removed lines
    for i in start..end {
        if i < lines.len() {
            preview.push_str(&format!("- {:4}  {}\n", i + 1, lines[i]));
        }
    }

    // Added lines
    for rline in replacement.lines() {
        preview.push_str(&format!("+ {:4}  {}\n", start + 1, rline));
    }

    // Context lines after
    let ctx_end = (end + 3).min(lines.len());
    for i in end..ctx_end {
        if i < lines.len() {
            preview.push_str(&format!("  {:4}  {}\n", i + 1, lines[i]));
        }
    }

    if preview.is_empty() {
        preview = "(empty diff)".into();
    }

    preview
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_path_traversal() {
        let a = AiAction::CreateFile {
            path: "../secrets.txt".into(),
            content: "".into(),
        };
        assert!(validate_action(&a).is_err());
    }

    #[test]
    fn validate_rejects_absolute_path() {
        let a = AiAction::CreateFile {
            path: "/etc/passwd".into(),
            content: "".into(),
        };
        assert!(validate_action(&a).is_err());
    }

    #[test]
    fn validate_rejects_zero_line_numbers() {
        let a = AiAction::PatchRange {
            path: "main.ino".into(),
            start_line: 0,
            end_line: 5,
            replacement: "".into(),
        };
        assert!(validate_action(&a).is_err());
    }

    #[test]
    fn validate_accepts_valid_actions() {
        let a = AiAction::CreateFile {
            path: "src/new_file.ino".into(),
            content: "void setup() {}".into(),
        };
        assert!(validate_action(&a).is_ok());

        let b = AiAction::PatchRange {
            path: "src/main.cpp".into(),
            start_line: 10,
            end_line: 15,
            replacement: "fixed".into(),
        };
        assert!(validate_action(&b).is_ok());
    }

    #[test]
    fn parse_valid_action_json() {
        let json = r#"{"kind":"createFile","path":"test.ino","content":"hello"}"#;
        let action = parse_action(json).unwrap();
        assert_eq!(action.target_path(), "test.ino");
    }

    #[test]
    fn parse_invalid_json_returns_error() {
        assert!(parse_action("not json").is_err());
    }

    #[test]
    fn describe_actions() {
        let a = AiAction::CreateFile {
            path: "src/main.ino".into(),
            content: "".into(),
        };
        assert_eq!(a.describe(), "Create file: src/main.ino");

        let b = AiAction::PatchRange {
            path: "src/main.ino".into(),
            start_line: 5,
            end_line: 10,
            replacement: "".into(),
        };
        assert_eq!(b.describe(), "Patch src/main.ino lines 5-10");
    }

    #[test]
    fn preview_patch_shows_diff() {
        let existing = "line1\nline2\nline3\nline4\nline5\nline6\n";
        let preview = preview_patch(existing, 2, 4, "new line 2\nnew line 3\n");
        assert!(preview.contains("-")); // removed lines
        assert!(preview.contains("+")); // added lines
        assert!(preview.contains("line1")); // context before
        assert!(preview.contains("line5")); // context after
    }
}
