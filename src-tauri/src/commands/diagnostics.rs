//! Diagnostics commands. The in-memory store lives on `AppState`; pushing emits
//! `diag://changed` so the Problems panel can refresh.

use crate::app_state::AppState;
use crate::diagnostics::Diagnostic;
use crate::errors::Result;
use tauri::{Emitter, State};

pub fn push_diagnostic_impl(state: &AppState, diagnostic: Diagnostic) -> Vec<Diagnostic> {
    state.push_diagnostic(diagnostic);
    state.diagnostics()
}

pub fn list_diagnostics_impl(state: &AppState) -> Vec<Diagnostic> {
    state.diagnostics()
}

pub fn clear_diagnostics_impl(state: &AppState) {
    state.clear_diagnostics();
}

#[tauri::command]
pub fn push_diagnostic(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    diagnostic: Diagnostic,
) -> Result<Vec<Diagnostic>> {
    let all = push_diagnostic_impl(&state, diagnostic);
    let _ = app.emit("diag://changed", &all);
    Ok(all)
}

#[tauri::command]
pub fn list_diagnostics(state: State<'_, AppState>) -> Result<Vec<Diagnostic>> {
    Ok(list_diagnostics_impl(&state))
}

#[tauri::command]
pub fn clear_diagnostics(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<()> {
    clear_diagnostics_impl(&state);
    let _ = app.emit("diag://changed", Vec::<Diagnostic>::new());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::diagnostics::{Range, Severity};
    use std::path::PathBuf;

    fn diag(line: u32) -> Diagnostic {
        Diagnostic {
            file: "code/main.ino".into(),
            range: Range {
                start_line: line,
                start_col: 1,
                end_line: line,
                end_col: 5,
            },
            severity: Severity::Warning,
            message: "unused variable".into(),
            source: "synthetic".into(),
        }
    }

    #[test]
    fn push_list_clear() {
        let state = AppState::new(PathBuf::from("/tmp/u.db"));
        assert!(list_diagnostics_impl(&state).is_empty());

        let all = push_diagnostic_impl(&state, diag(3));
        assert_eq!(all.len(), 1);
        push_diagnostic_impl(&state, diag(7));
        assert_eq!(list_diagnostics_impl(&state).len(), 2);

        clear_diagnostics_impl(&state);
        assert!(list_diagnostics_impl(&state).is_empty());
    }
}
