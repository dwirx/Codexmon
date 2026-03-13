use chrono::Utc;
use reqwest::Client;

use crate::codex::{
    auth::{AccountIdentity, StoredCredentials},
    error::{AppError, AppResult},
    models::{
        AccountSnapshot, CodexUsageSnapshot, CreditsSnapshot, LimitSnapshot, RateLimitResponse,
        UsageApiResponse, UsageWindowResponse,
    },
};

const USAGE_URL: &str = "https://chatgpt.com/backend-api/wham/usage";
const FIVE_HOURS_SECONDS: i64 = 5 * 60 * 60;
const WEEK_SECONDS: i64 = 7 * 24 * 60 * 60;

pub async fn fetch_snapshot(client: &Client, credentials: &StoredCredentials) -> AppResult<CodexUsageSnapshot> {
    let mut request = client
        .get(USAGE_URL)
        .header("Authorization", format!("Bearer {}", credentials.access_token))
        .header("Accept", "application/json");

    if let Some(account_id) = credentials.account_id.as_deref() {
        request = request.header("ChatGPT-Account-Id", account_id);
    }

    let response = request.send().await?;

    match response.status().as_u16() {
        200..=299 => {
            let payload: UsageApiResponse = response.json().await?;
            Ok(map_snapshot(payload, credentials.account_identity()))
        }
        401 | 403 => Err(AppError::Unauthorized),
        status => {
            let body = response.text().await.unwrap_or_else(|_| String::from("no response body"));
            Err(AppError::Api(format!("{status}: {body}")))
        }
    }
}

fn map_snapshot(response: UsageApiResponse, account_identity: AccountIdentity) -> CodexUsageSnapshot {
    let now = Utc::now().timestamp();
    let rate_limit = response.rate_limit.clone();
    let primary_window = rate_limit.primary_window.clone();
    let secondary_window = rate_limit.secondary_window.clone();

    CodexUsageSnapshot {
        plan_type: response.plan_type,
        source: String::from("oauth"),
        fetched_at: now,
        account: AccountSnapshot {
            display_name: account_identity.display_name,
            safe_user: account_identity.safe_user,
            email: account_identity.email,
            masked_email: account_identity.masked_email,
            email_verified: account_identity.email_verified,
            auth_time: account_identity.auth_time,
            account_label: account_identity.account_label,
        },
        credits: CreditsSnapshot {
            has_credits: response.credits.has_credits,
            unlimited: response.credits.unlimited,
            balance: response.credits.balance,
            approx_local_messages: response.credits.approx_local_messages,
            approx_cloud_messages: response.credits.approx_cloud_messages,
        },
        five_hour_limit: map_limit_snapshot(
            "5h limit",
            rate_limit.clone(),
            primary_window,
            FIVE_HOURS_SECONDS,
            now,
        ),
        weekly_limit: map_limit_snapshot(
            "Weekly limit",
            rate_limit.clone(),
            secondary_window,
            WEEK_SECONDS,
            now,
        ),
    }
}

fn map_limit_snapshot(
    label: &str,
    rate_limit: RateLimitResponse,
    window: Option<UsageWindowResponse>,
    fallback_window_seconds: i64,
    now: i64,
) -> LimitSnapshot {
    let used_percent = window
        .as_ref()
        .map(|entry| entry.used_percent)
        .unwrap_or_default()
        .clamp(0.0, 100.0);
    let limit_window_seconds = window
        .as_ref()
        .and_then(|entry| entry.limit_window_seconds)
        .unwrap_or(fallback_window_seconds);
    let reset_at = window.as_ref().and_then(|entry| entry.reset_at);
    let reset_after_seconds = window
        .as_ref()
        .and_then(|entry| entry.reset_after_seconds)
        .or_else(|| reset_at.map(|timestamp| (timestamp - now).max(0)));

    LimitSnapshot {
        label: String::from(label),
        used_percent,
        remaining_percent: (100.0 - used_percent).clamp(0.0, 100.0),
        limit_window_seconds,
        reset_at,
        reset_after_seconds,
        allowed: rate_limit.allowed,
        limit_reached: rate_limit.limit_reached || used_percent >= 100.0,
    }
}
