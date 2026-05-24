use std::{fmt, path::PathBuf};

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug)]
pub enum AppError {
    AuthFileMissing(PathBuf),
    HomeDirectoryMissing,
    UnsupportedAuthMode(String),
    InvalidAuthFile(String),
    MissingTokens,
    AuthRefreshFailed(String),
    Unauthorized,
    Network(String),
    Api(String),
    Io(String),
    Serialization(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AuthFileMissing(path) => write!(
                f,
                "Codex auth file not found at {}. Run `codex` and sign in first.",
                path.display()
            ),
            Self::HomeDirectoryMissing => {
                write!(
                    f,
                    "Unable to resolve the current home directory for Codex auth lookup."
                )
            }
            Self::UnsupportedAuthMode(mode) => write!(
                f,
                "Codex is using unsupported auth mode `{mode}`. Sign in with ChatGPT OAuth first."
            ),
            Self::InvalidAuthFile(message) => write!(f, "Invalid Codex auth file: {message}"),
            Self::MissingTokens => {
                write!(
                    f,
                    "Codex auth.json is present but does not contain OAuth tokens."
                )
            }
            Self::AuthRefreshFailed(message) => {
                write!(f, "Failed to refresh Codex OAuth token: {message}")
            }
            Self::Unauthorized => write!(
                f,
                "Codex usage request was rejected. Refresh the session by running `codex` again."
            ),
            Self::Network(message) => write!(
                f,
                "Network error while talking to Codex usage API: {message}"
            ),
            Self::Api(message) => write!(
                f,
                "Codex usage API returned an unexpected response: {message}"
            ),
            Self::Io(message) => write!(f, "I/O error while reading Codex state: {message}"),
            Self::Serialization(message) => write!(f, "Failed to decode Codex response: {message}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::Serialization(error.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(error: reqwest::Error) -> Self {
        Self::Network(error.to_string())
    }
}
