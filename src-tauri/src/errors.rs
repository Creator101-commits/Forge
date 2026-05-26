//! Typed errors that cross the IPC boundary. Always carry a stable `code`
//! so the frontend can branch on identity rather than message text.

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ForgeError {
    #[error("invalid argument: {0}")]
    InvalidArgument(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("keyring error: {0}")]
    Keyring(String),

    #[error("internal: {0}")]
    Internal(String),
}

impl ForgeError {
    pub fn code(&self) -> &'static str {
        match self {
            ForgeError::InvalidArgument(_) => "invalid_argument",
            ForgeError::NotFound(_) => "not_found",
            ForgeError::Io(_) => "io",
            ForgeError::Keyring(_) => "keyring",
            ForgeError::Internal(_) => "internal",
        }
    }
}

/// Serialized form sent over IPC. We intentionally don't `Serialize` the enum
/// directly so we can shape the wire format independent of the variant set.
#[derive(Debug, Serialize)]
pub struct WireError {
    pub code: String,
    pub message: String,
}

impl From<ForgeError> for WireError {
    fn from(e: ForgeError) -> Self {
        WireError {
            code: e.code().to_string(),
            message: e.to_string(),
        }
    }
}

impl Serialize for ForgeError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        WireError::from(ForgeError::clone_for_wire(self)).serialize(s)
    }
}

impl ForgeError {
    fn clone_for_wire(e: &ForgeError) -> ForgeError {
        match e {
            ForgeError::InvalidArgument(m) => ForgeError::InvalidArgument(m.clone()),
            ForgeError::NotFound(m) => ForgeError::NotFound(m.clone()),
            ForgeError::Io(_) => ForgeError::Internal(e.to_string()),
            ForgeError::Keyring(m) => ForgeError::Keyring(m.clone()),
            ForgeError::Internal(m) => ForgeError::Internal(m.clone()),
        }
    }
}

pub type Result<T> = std::result::Result<T, ForgeError>;
