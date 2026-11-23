use serde::{Serialize, Serializer};
use std::fmt;

#[derive(Debug)]
pub enum Error {
    Invoke(String),
    Tauri(tauri::Error),
    UnsupportedPlatform,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Invoke(s) => write!(f, "invoke: {s}"),
            Error::Tauri(e) => write!(f, "tauri: {e}"),
            Error::UnsupportedPlatform => write!(f, "not supported on this platform"),
        }
    }
}

impl std::error::Error for Error {}

impl From<tauri::Error> for Error {
    fn from(e: tauri::Error) -> Self {
        Error::Tauri(e)
    }
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
