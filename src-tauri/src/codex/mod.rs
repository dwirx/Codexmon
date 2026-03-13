mod auth;
mod client;
mod error;
mod models;

use reqwest::Client;

use self::{
    auth::{load_credentials, refresh_credentials},
    client::fetch_snapshot,
    error::{AppError, AppResult},
    models::CodexUsageSnapshot,
};

#[tauri::command]
pub async fn get_codex_usage_snapshot() -> Result<CodexUsageSnapshot, String> {
    fetch_codex_usage_snapshot()
        .await
        .map_err(|error| error.to_string())
}

async fn fetch_codex_usage_snapshot() -> AppResult<CodexUsageSnapshot> {
    let client = Client::builder().user_agent("codex-cli").build()?;
    let mut credentials = load_credentials()?;

    if credentials.needs_refresh() {
        credentials = refresh_credentials(&client, credentials).await?;
    }

    match fetch_snapshot(&client, &credentials).await {
        Ok(snapshot) => Ok(snapshot),
        Err(AppError::Unauthorized) => {
            let refreshed = refresh_credentials(&client, credentials).await?;
            fetch_snapshot(&client, &refreshed).await
        }
        Err(error) => Err(error),
    }
}
