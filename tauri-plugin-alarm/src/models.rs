use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmArgs {
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub step_name: String,
    #[serde(default)]
    pub food_name: String,
    #[serde(default = "default_dismiss_label")]
    pub dismiss_label: String,
}

fn default_dismiss_label() -> String {
    "Dismiss".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RingingStatus {
    pub ringing: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OemInfo {
    pub manufacturer: String,
    pub is_xiaomi: bool,
}