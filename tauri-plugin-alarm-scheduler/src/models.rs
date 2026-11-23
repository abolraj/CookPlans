use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleArgs {
    pub id: i32,
    pub trigger_at_millis: i64,
    pub title: String,
    pub body: String,
    #[serde(default)] pub step_name: String,
    #[serde(default)] pub food_name: String,
    #[serde(default = "default_dismiss")]
    pub dismiss_label: String,
}
fn default_dismiss() -> String { "Dismiss".into() }

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelArgs { pub id: i32 }

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionsStatus {
    pub notifications_granted: bool,
    pub exact_alarm_granted: bool,
    pub full_screen_intent_granted: bool,
}