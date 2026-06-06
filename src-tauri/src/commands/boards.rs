//! Board profile catalog command.

use crate::boards::{self, BoardProfile};
use crate::errors::Result;

#[tauri::command]
pub fn list_board_profiles() -> Result<Vec<BoardProfile>> {
    Ok(boards::catalog())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn returns_catalog() {
        assert!(list_board_profiles().unwrap().len() >= 7);
    }
}
