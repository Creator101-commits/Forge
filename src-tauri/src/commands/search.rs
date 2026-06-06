//! Project-wide search command.

use crate::app_state::AppState;
use crate::errors::{ForgeError, Result};
use crate::search::{self, SearchHit, SearchOptions};
use tauri::State;

pub fn search_project_impl(state: &AppState, opts: &SearchOptions) -> Result<Vec<SearchHit>> {
    let root = state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project".into()))?;
    search::search_project(&root, opts)
}

#[tauri::command]
pub fn search_project(
    state: State<'_, AppState>,
    options: SearchOptions,
) -> Result<Vec<SearchHit>> {
    search_project_impl(&state, &options)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::filesystem::write_file;
    use crate::project_store;
    use tempfile::tempdir;

    #[test]
    fn searches_within_the_active_project() {
        let tmp = tempdir().unwrap();
        let state = AppState::new(tmp.path().join("forge-user.db"));
        let root = tmp.path().join("proj");
        let project = project_store::create_project(&root, "Demo").unwrap();
        state.set_active(&root, project);

        write_file(&root, "code/main.ino", "// TODO blink\nvoid loop(){}").unwrap();
        let hits = search_project_impl(
            &state,
            &SearchOptions {
                query: "TODO".into(),
                case_sensitive: false,
                is_regex: false,
                max_results: None,
            },
        )
        .unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "code/main.ino");
    }
}
