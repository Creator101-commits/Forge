//! Serial commands. Opening a connection installs a `SerialSession` on
//! `AppState` whose reader thread forwards bytes as `serial://data` events;
//! connection lifecycle is reported via `serial://status`.

use crate::app_state::AppState;
use crate::errors::Result;
use crate::serial::{self, SerialConfig, SerialPortInfo, SerialSession};
use tauri::{Emitter, State};

pub fn list_serial_ports_impl() -> Result<Vec<SerialPortInfo>> {
    serial::list_ports()
}

pub fn connect_serial_impl<F>(state: &AppState, config: SerialConfig, on_data: F) -> Result<()>
where
    F: Fn(Vec<u8>) + Send + 'static,
{
    let session = SerialSession::open(config, on_data)?;
    state.set_serial(Some(session));
    Ok(())
}

pub fn disconnect_serial_impl(state: &AppState) {
    state.set_serial(None);
}

pub fn send_serial_data_impl(state: &AppState, data: &[u8]) -> Result<()> {
    state.serial_write(data)
}

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<SerialPortInfo>> {
    list_serial_ports_impl()
}

#[tauri::command]
pub fn connect_serial(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    config: SerialConfig,
) -> Result<()> {
    let app_data = app.clone();
    connect_serial_impl(&state, config, move |bytes| {
        let text = String::from_utf8_lossy(&bytes).into_owned();
        let _ = app_data.emit("serial://data", text);
    })?;
    let _ = app.emit("serial://status", "connected");
    Ok(())
}

#[tauri::command]
pub fn disconnect_serial(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<()> {
    disconnect_serial_impl(&state);
    let _ = app.emit("serial://status", "disconnected");
    Ok(())
}

#[tauri::command]
pub fn send_serial_data(state: State<'_, AppState>, data: String) -> Result<()> {
    send_serial_data_impl(&state, data.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::serial::{set_backend, MockBackend};
    use std::path::PathBuf;
    use std::sync::mpsc;
    use std::sync::Arc;
    use std::time::Duration;

    #[test]
    fn connect_send_receive_disconnect() {
        set_backend(Arc::new(MockBackend::default()));
        let state = AppState::new(PathBuf::from("/tmp/u.db"));
        let (tx, rx) = mpsc::channel::<Vec<u8>>();

        connect_serial_impl(
            &state,
            SerialConfig {
                port: "mock".into(),
                baud: 9600,
            },
            move |b| {
                let _ = tx.send(b);
            },
        )
        .unwrap();
        assert!(state.has_serial());

        send_serial_data_impl(&state, b"AT\n").unwrap();

        let deadline = std::time::Instant::now() + Duration::from_secs(1);
        let mut got = Vec::new();
        while std::time::Instant::now() < deadline && got.len() < 3 {
            if let Ok(chunk) = rx.recv_timeout(Duration::from_millis(50)) {
                got.extend(chunk);
            }
        }
        assert_eq!(got, b"AT\n");

        disconnect_serial_impl(&state);
        assert!(!state.has_serial());
        assert!(send_serial_data_impl(&state, b"x").is_err());
    }
}
