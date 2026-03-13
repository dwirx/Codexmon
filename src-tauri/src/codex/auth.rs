use std::{
    env, fs,
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{DateTime, Duration, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::codex::error::{AppError, AppResult};

const AUTH_FILE_NAME: &str = "auth.json";
const TOKEN_REFRESH_INTERVAL_DAYS: i64 = 8;
const REFRESH_URL: &str = "https://auth.openai.com/oauth/token";
const CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const OAUTH_SCOPE: &str = "openid profile email";

#[derive(Debug, Deserialize, Serialize, Clone)]
struct AuthFile {
    auth_mode: Option<String>,
    #[serde(rename = "OPENAI_API_KEY")]
    openai_api_key: Option<String>,
    tokens: Option<AuthTokens>,
    last_refresh: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
struct AuthTokens {
    access_token: Option<String>,
    refresh_token: Option<String>,
    id_token: Option<String>,
    account_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct RefreshRequest<'a> {
    client_id: &'a str,
    grant_type: &'a str,
    refresh_token: &'a str,
    scope: &'a str,
}

#[derive(Debug, Deserialize)]
struct RefreshResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IdTokenClaims {
    email: Option<String>,
    email_verified: Option<bool>,
    auth_time: Option<i64>,
    sub: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AccountIdentity {
    pub display_name: String,
    pub safe_user: String,
    pub email: Option<String>,
    pub masked_email: Option<String>,
    pub email_verified: bool,
    pub auth_time: Option<i64>,
    pub account_label: String,
}

#[derive(Debug, Clone)]
pub struct StoredCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub id_token: Option<String>,
    pub account_id: Option<String>,
    pub last_refresh: Option<DateTime<Utc>>,
    path: PathBuf,
    file: AuthFile,
}

impl StoredCredentials {
    pub fn needs_refresh(&self) -> bool {
        self.last_refresh
            .map(|timestamp| Utc::now() - timestamp >= Duration::days(TOKEN_REFRESH_INTERVAL_DAYS))
            .unwrap_or(true)
    }

    fn with_refreshed_tokens(mut self, response: RefreshResponse) -> Self {
        let tokens = self.file.tokens.get_or_insert_with(AuthTokens::default);
        tokens.access_token = Some(response.access_token.clone());
        tokens.refresh_token = Some(
            response
                .refresh_token
                .clone()
                .unwrap_or_else(|| self.refresh_token.clone()),
        );
        tokens.id_token = response.id_token.clone().or_else(|| self.id_token.clone());
        tokens.account_id = tokens.account_id.clone().or_else(|| self.account_id.clone());

        let refreshed_at = Utc::now();
        self.file.last_refresh = Some(refreshed_at.to_rfc3339());
        self.access_token = response.access_token;
        self.refresh_token = response
            .refresh_token
            .unwrap_or_else(|| self.refresh_token.clone());
        self.id_token = tokens.id_token.clone();
        self.account_id = tokens.account_id.clone();
        self.last_refresh = Some(refreshed_at);

        self
    }

    fn path(&self) -> &Path {
        &self.path
    }

    pub fn account_identity(&self) -> AccountIdentity {
        let claims = self
            .id_token
            .as_deref()
            .and_then(|token| decode_id_token_claims(token).ok());
        let email = claims.as_ref().and_then(|entry| entry.email.clone());
        let masked_email = email.as_deref().map(mask_email);
        let auth_time = claims.as_ref().and_then(|entry| entry.auth_time);
        let safe_user = make_safe_user(
            claims.as_ref().and_then(|entry| entry.sub.as_deref()),
            self.account_id.as_deref(),
        );
        let display_name = email
            .as_deref()
            .map(make_display_name)
            .unwrap_or_else(|| fallback_display_name(self.account_id.as_deref()));
        let account_label = masked_email
            .clone()
            .unwrap_or_else(|| fallback_account_label(self.account_id.as_deref()));
        let email_verified = claims
            .as_ref()
            .and_then(|entry| entry.email_verified)
            .unwrap_or(false);

        AccountIdentity {
            display_name,
            safe_user,
            email,
            masked_email,
            email_verified,
            auth_time,
            account_label,
        }
    }
}

pub fn load_credentials() -> AppResult<StoredCredentials> {
    let path = resolve_auth_path()?;
    if !path.exists() {
        return Err(AppError::AuthFileMissing(path));
    }

    let contents = fs::read_to_string(&path)?;
    let auth_file: AuthFile = serde_json::from_str(&contents)?;

    if let Some(mode) = auth_file.auth_mode.clone() {
        if mode != "chatgpt" && mode != "oauth" {
            return Err(AppError::UnsupportedAuthMode(mode));
        }
    }

    let tokens = auth_file.tokens.clone().ok_or(AppError::MissingTokens)?;
    let access_token = tokens
        .access_token
        .clone()
        .filter(|value| !value.trim().is_empty())
        .ok_or(AppError::MissingTokens)?;
    let refresh_token = tokens
        .refresh_token
        .clone()
        .filter(|value| !value.trim().is_empty())
        .ok_or(AppError::MissingTokens)?;

    Ok(StoredCredentials {
        access_token,
        refresh_token,
        id_token: tokens.id_token.clone(),
        account_id: tokens.account_id.clone(),
        last_refresh: parse_refresh_timestamp(auth_file.last_refresh.as_deref())?,
        path,
        file: auth_file,
    })
}

pub async fn refresh_credentials(client: &Client, credentials: StoredCredentials) -> AppResult<StoredCredentials> {
    let response = client
        .post(REFRESH_URL)
        .json(&RefreshRequest {
            client_id: CLIENT_ID,
            grant_type: "refresh_token",
            refresh_token: &credentials.refresh_token,
            scope: OAUTH_SCOPE,
        })
        .send()
        .await?;

    if response.status().as_u16() == 401 {
        let body = response.text().await.unwrap_or_else(|_| String::from("unauthorized"));
        return Err(AppError::AuthRefreshFailed(body));
    }

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_else(|_| String::from("unknown refresh failure"));
        return Err(AppError::AuthRefreshFailed(format!("{status}: {body}")));
    }

    let refreshed: RefreshResponse = response.json().await?;
    let updated = credentials.with_refreshed_tokens(refreshed);
    persist_credentials(&updated)?;

    Ok(updated)
}

fn persist_credentials(credentials: &StoredCredentials) -> AppResult<()> {
    let body = serde_json::to_string_pretty(&credentials.file)?;
    fs::write(credentials.path(), body)?;
    Ok(())
}

fn resolve_auth_path() -> AppResult<PathBuf> {
    if let Ok(codex_home) = env::var("CODEX_HOME") {
        let path = PathBuf::from(codex_home).join(AUTH_FILE_NAME);
        return Ok(path);
    }

    let home = dirs::home_dir().ok_or(AppError::HomeDirectoryMissing)?;
    Ok(home.join(".codex").join(AUTH_FILE_NAME))
}

fn parse_refresh_timestamp(value: Option<&str>) -> AppResult<Option<DateTime<Utc>>> {
    let Some(raw) = value else {
        return Ok(None);
    };

    let parsed = DateTime::parse_from_rfc3339(raw)
        .map_err(|error| AppError::InvalidAuthFile(error.to_string()))?;

    Ok(Some(parsed.with_timezone(&Utc)))
}

fn decode_id_token_claims(token: &str) -> AppResult<IdTokenClaims> {
    let payload = token
        .split('.')
        .nth(1)
        .ok_or_else(|| AppError::InvalidAuthFile(String::from("missing JWT payload")))?;
    let decoded = URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|error| AppError::InvalidAuthFile(error.to_string()))?;
    let claims = serde_json::from_slice::<IdTokenClaims>(&decoded)?;

    Ok(claims)
}

fn make_display_name(email: &str) -> String {
    let local = email.split('@').next().unwrap_or("user");
    let compact = local
        .split(['.', '+', '-', '_'])
        .find(|segment| !segment.is_empty())
        .unwrap_or(local);

    let mut chars = compact.chars();
    let Some(first) = chars.next() else {
        return String::from("Codex User");
    };

    let rest = chars.as_str().to_lowercase();
    format!("{}{}", first.to_uppercase(), rest)
}

fn mask_email(email: &str) -> String {
    let mut parts = email.split('@');
    let local = parts.next().unwrap_or_default();
    let domain = parts.next().unwrap_or_default();

    if local.is_empty() || domain.is_empty() {
        return String::from(email);
    }

    let local_chars: Vec<char> = local.chars().collect();
    let masked_local = match local_chars.len() {
        0 => String::from("***"),
        1 => format!("{}***", local_chars[0]),
        2 => format!("{}***", local_chars[0]),
        len => format!(
            "{}{}{}",
            local_chars[0],
            "*".repeat(len.saturating_sub(2)),
            local_chars[len - 1]
        ),
    };

    format!("{masked_local}@{domain}")
}

fn fallback_display_name(account_id: Option<&str>) -> String {
    account_id
        .map(|value| format!("User {}", short_account_suffix(value)))
        .unwrap_or_else(|| String::from("Codex User"))
}

fn fallback_account_label(account_id: Option<&str>) -> String {
    account_id
        .map(|value| format!("account-{}", short_account_suffix(value)))
        .unwrap_or_else(|| String::from("account-unknown"))
}

fn make_safe_user(subject: Option<&str>, account_id: Option<&str>) -> String {
    let suffix = subject
        .map(short_identity_suffix)
        .or_else(|| account_id.map(short_identity_suffix))
        .unwrap_or_else(|| String::from("user"));

    format!("codex-{suffix}")
}

fn short_account_suffix(account_id: &str) -> String {
    short_identity_suffix(account_id)
}

fn short_identity_suffix(identity: &str) -> String {
    identity
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect()
}
