//! Settings commands. Thin shims over the user-level settings store.

use crate::app_state::AppState;
use crate::errors::Result;
use crate::schema::Settings;
use crate::settings as store;
use tauri::State;

pub fn get_settings_impl(state: &AppState) -> Result<Settings> {
    store::get(&state.user_db())
}

pub fn set_settings_impl(state: &AppState, settings: &Settings) -> Result<Settings> {
    store::set(&state.user_db(), settings)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings> {
    get_settings_impl(&state)
}

#[tauri::command]
pub fn set_settings(state: State<'_, AppState>, settings: Settings) -> Result<Settings> {
    set_settings_impl(&state, &settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::tempdir;

    fn state_in(dir: &Path) -> AppState {
        AppState::new(dir.join("forge-user.db"))
    }

    #[test]
    fn get_returns_defaults_then_persists_set() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        assert_eq!(get_settings_impl(&state).unwrap(), Settings::default());

        let s = Settings {
            theme: "light".into(),
            ..Default::default()
        };
        set_settings_impl(&state, &s).unwrap();

        // New state over the same DB simulates an app restart.
        let restarted = state_in(tmp.path());
        assert_eq!(get_settings_impl(&restarted).unwrap().theme, "light");
    }
}
