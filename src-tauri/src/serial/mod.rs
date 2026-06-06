//! Serial port access.
//!
//! A `SerialBackend` trait abstracts port enumeration + opening, with a real
//! `serialport`-backed implementation and an in-memory loopback mock for tests
//! / headless CI. An opened connection is driven by a `SerialSession` that runs
//! a background reader thread delivering bytes to a callback (the command layer
//! forwards them to the UI as `serial://data` events).

use crate::errors::{ForgeError, Result};
use once_cell::sync::OnceCell;
use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Duration;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct SerialPortInfo {
    pub name: String,
    /// `"usb" | "bluetooth" | "pci" | "unknown"`.
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct SerialConfig {
    pub port: String,
    #[ts(type = "number")]
    pub baud: u32,
}

pub trait SerialConnection: Send {
    fn write_all(&mut self, data: &[u8]) -> Result<()>;
    /// Read available bytes into `buf`, returning the count. Returns 0 when no
    /// data is currently available (must not block indefinitely).
    fn read(&mut self, buf: &mut [u8]) -> Result<usize>;
}

pub trait SerialBackend: Send + Sync + 'static {
    fn list_ports(&self) -> Result<Vec<SerialPortInfo>>;
    fn open(&self, config: &SerialConfig) -> Result<Box<dyn SerialConnection>>;
}

// ---------- Real serialport backend ----------

pub struct RealBackend;

struct RealConnection {
    port: Box<dyn serialport::SerialPort>,
}

impl SerialConnection for RealConnection {
    fn write_all(&mut self, data: &[u8]) -> Result<()> {
        std::io::Write::write_all(&mut self.port, data).map_err(ForgeError::from)
    }
    fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
        match std::io::Read::read(&mut self.port, buf) {
            Ok(n) => Ok(n),
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => Ok(0),
            Err(e) => Err(ForgeError::from(e)),
        }
    }
}

impl SerialBackend for RealBackend {
    fn list_ports(&self) -> Result<Vec<SerialPortInfo>> {
        let ports = serialport::available_ports()
            .map_err(|e| ForgeError::Internal(format!("port enumeration failed: {e}")))?;
        Ok(ports
            .into_iter()
            .map(|p| SerialPortInfo {
                name: p.port_name,
                kind: match p.port_type {
                    serialport::SerialPortType::UsbPort(_) => "usb",
                    serialport::SerialPortType::BluetoothPort => "bluetooth",
                    serialport::SerialPortType::PciPort => "pci",
                    serialport::SerialPortType::Unknown => "unknown",
                }
                .to_string(),
            })
            .collect())
    }

    fn open(&self, config: &SerialConfig) -> Result<Box<dyn SerialConnection>> {
        let port = serialport::new(&config.port, config.baud)
            .timeout(Duration::from_millis(50))
            .open()
            .map_err(|e| ForgeError::Internal(format!("failed to open {}: {e}", config.port)))?;
        Ok(Box::new(RealConnection { port }))
    }
}

// ---------- In-memory loopback mock ----------

#[derive(Default)]
pub struct MockBackend {
    pub ports: Vec<SerialPortInfo>,
}

impl MockBackend {
    pub fn with_ports(ports: Vec<SerialPortInfo>) -> Self {
        MockBackend { ports }
    }
}

/// A loopback connection: bytes written are immediately readable back, which
/// lets tests assert round-trips without hardware.
pub struct MockConnection {
    buf: Arc<Mutex<VecDeque<u8>>>,
}

impl SerialConnection for MockConnection {
    fn write_all(&mut self, data: &[u8]) -> Result<()> {
        self.buf.lock().extend(data.iter().copied());
        Ok(())
    }
    fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
        let mut q = self.buf.lock();
        let n = buf.len().min(q.len());
        for slot in buf.iter_mut().take(n) {
            *slot = q.pop_front().unwrap();
        }
        Ok(n)
    }
}

impl SerialBackend for MockBackend {
    fn list_ports(&self) -> Result<Vec<SerialPortInfo>> {
        Ok(self.ports.clone())
    }
    fn open(&self, _config: &SerialConfig) -> Result<Box<dyn SerialConnection>> {
        Ok(Box::new(MockConnection {
            buf: Arc::new(Mutex::new(VecDeque::new())),
        }))
    }
}

// ---------- Global backend registry ----------

static BACKEND: OnceCell<RwLock<Arc<dyn SerialBackend>>> = OnceCell::new();

fn backend_slot() -> &'static RwLock<Arc<dyn SerialBackend>> {
    BACKEND.get_or_init(|| RwLock::new(Arc::new(RealBackend) as Arc<dyn SerialBackend>))
}

pub fn set_backend(b: Arc<dyn SerialBackend>) {
    *backend_slot().write() = b;
}

pub fn backend() -> Arc<dyn SerialBackend> {
    backend_slot().read().clone()
}

pub fn list_ports() -> Result<Vec<SerialPortInfo>> {
    backend().list_ports()
}

// ---------- Session ----------

/// An active serial connection with a background reader thread.
pub struct SerialSession {
    conn: Arc<Mutex<Box<dyn SerialConnection>>>,
    stop: Arc<AtomicBool>,
    reader: Option<JoinHandle<()>>,
    pub config: SerialConfig,
}

impl SerialSession {
    /// Open `config` via the active backend and start streaming incoming bytes
    /// to `on_data`.
    pub fn open<F>(config: SerialConfig, on_data: F) -> Result<Self>
    where
        F: Fn(Vec<u8>) + Send + 'static,
    {
        let conn = backend().open(&config)?;
        let conn = Arc::new(Mutex::new(conn));
        let stop = Arc::new(AtomicBool::new(false));

        let reader_conn = Arc::clone(&conn);
        let reader_stop = Arc::clone(&stop);
        let reader = std::thread::spawn(move || {
            let mut buf = [0u8; 1024];
            while !reader_stop.load(Ordering::Relaxed) {
                let n = { reader_conn.lock().read(&mut buf).unwrap_or(0) };
                if n > 0 {
                    on_data(buf[..n].to_vec());
                } else {
                    std::thread::sleep(Duration::from_millis(10));
                }
            }
        });

        Ok(SerialSession {
            conn,
            stop,
            reader: Some(reader),
            config,
        })
    }

    pub fn write(&self, data: &[u8]) -> Result<()> {
        self.conn.lock().write_all(data)
    }
}

impl Drop for SerialSession {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = self.reader.take() {
            let _ = handle.join();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Instant;

    fn use_mock(ports: Vec<SerialPortInfo>) {
        set_backend(Arc::new(MockBackend::with_ports(ports)));
    }

    #[test]
    fn lists_mock_ports() {
        use_mock(vec![SerialPortInfo {
            name: "/dev/ttyMOCK".into(),
            kind: "usb".into(),
        }]);
        let ports = list_ports().unwrap();
        assert_eq!(ports.len(), 1);
        assert_eq!(ports[0].name, "/dev/ttyMOCK");
    }

    #[test]
    fn loopback_connection_round_trips_bytes() {
        let backend = MockBackend::default();
        let mut conn = backend
            .open(&SerialConfig {
                port: "mock".into(),
                baud: 115200,
            })
            .unwrap();
        conn.write_all(b"hello").unwrap();
        let mut buf = [0u8; 16];
        let n = conn.read(&mut buf).unwrap();
        assert_eq!(&buf[..n], b"hello");
    }

    #[test]
    fn session_streams_written_bytes_back_to_callback() {
        use_mock(vec![]);
        let (tx, rx) = mpsc::channel::<Vec<u8>>();
        let session = SerialSession::open(
            SerialConfig {
                port: "mock".into(),
                baud: 9600,
            },
            move |data| {
                let _ = tx.send(data);
            },
        )
        .unwrap();

        session.write(b"ping\n").unwrap();

        // The loopback echoes; the reader thread should deliver it promptly.
        let deadline = Instant::now() + Duration::from_secs(1);
        let mut received = Vec::new();
        while Instant::now() < deadline && received.len() < 5 {
            if let Ok(chunk) = rx.recv_timeout(Duration::from_millis(50)) {
                received.extend(chunk);
            }
        }
        assert_eq!(received, b"ping\n");
    }
}
