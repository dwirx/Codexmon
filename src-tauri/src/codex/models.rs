use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone)]
pub struct UsageApiResponse {
    pub plan_type: Option<String>,
    #[serde(default)]
    pub rate_limit: RateLimitResponse,
    #[serde(default)]
    pub credits: CreditsResponse,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct RateLimitResponse {
    #[serde(default)]
    pub allowed: bool,
    #[serde(default)]
    pub limit_reached: bool,
    pub primary_window: Option<UsageWindowResponse>,
    pub secondary_window: Option<UsageWindowResponse>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct UsageWindowResponse {
    #[serde(default)]
    pub used_percent: f64,
    pub limit_window_seconds: Option<i64>,
    pub reset_after_seconds: Option<i64>,
    pub reset_at: Option<i64>,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct CreditsResponse {
    #[serde(default)]
    pub has_credits: bool,
    #[serde(default)]
    pub unlimited: bool,
    pub balance: Option<f64>,
    pub approx_local_messages: Option<i64>,
    pub approx_cloud_messages: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodexUsageSnapshot {
    pub plan_type: Option<String>,
    pub source: String,
    pub fetched_at: i64,
    pub account: AccountSnapshot,
    pub credits: CreditsSnapshot,
    pub five_hour_limit: LimitSnapshot,
    pub weekly_limit: LimitSnapshot,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub display_name: String,
    pub safe_user: String,
    pub email: Option<String>,
    pub masked_email: Option<String>,
    pub email_verified: bool,
    pub auth_time: Option<i64>,
    pub account_label: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreditsSnapshot {
    pub has_credits: bool,
    pub unlimited: bool,
    pub balance: Option<f64>,
    pub approx_local_messages: Option<i64>,
    pub approx_cloud_messages: Option<i64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LimitSnapshot {
    pub label: String,
    pub used_percent: f64,
    pub remaining_percent: f64,
    pub limit_window_seconds: i64,
    pub reset_at: Option<i64>,
    pub reset_after_seconds: Option<i64>,
    pub allowed: bool,
    pub limit_reached: bool,
}
