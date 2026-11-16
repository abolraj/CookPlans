use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug)]
pub struct AppError(pub String);

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for AppError {}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.0)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError(format!("db: {e}"))
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub slug: String,
    pub is_active: bool,
    pub start_weekday: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meal {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub meal_type: String,
    pub deadline_at: i64,
    pub started_at: Option<i64>,
    pub food_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Food {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub min_duration: i64,
    pub max_duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FoodStep {
    pub id: i64,
    pub food_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub duration: i64,
    pub min_duration: i64,
    pub max_duration: i64,
    pub offset_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledStep {
    pub food_name: String,
    pub step_name: String,
    pub step_description: Option<String>,
    pub notify_at_minutes: i64,
    pub duration: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanStep {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub start_at: i64,
    pub end_at: i64,
    pub duration: i64,
    pub offset_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MealPlanDetails {
    pub meal: Meal,
    pub food: Food,
    pub cook_start_at: i64,
    pub cook_end_at: i64,
    pub steps: Vec<MealPlanStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanMealDetail {
    pub plan_meal_id: i64,
    pub weekday: i64,
    pub details: MealPlanDetails,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanInput {
    pub name: String,
    pub description: Option<String>,
    pub slug: String,
    pub start_weekday: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlanInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub slug: String,
    pub start_weekday: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMealInput {
    pub plan_id: i64,
    pub weekday: i64,
    pub name: String,
    pub description: Option<String>,
    pub meal_type: String,
    pub deadline_at: i64,
    pub food_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMealInput {
    pub meal_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub meal_type: String,
    pub deadline_at: i64,
    pub food_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFoodInput {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub min_duration: i64,
    pub max_duration: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFoodInput {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub min_duration: i64,
    pub max_duration: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStepInput {
    pub food_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub duration: i64,
    pub min_duration: i64,
    pub max_duration: i64,
    pub offset_time: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStepInput {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub duration: i64,
    pub min_duration: i64,
    pub max_duration: i64,
    pub offset_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportStep {
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub duration: i64,
    #[serde(default)]
    pub min_duration: i64,
    #[serde(default)]
    pub max_duration: i64,
    #[serde(default)]
    pub offset_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFood {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    #[serde(default)]
    pub min_duration: i64,
    #[serde(default)]
    pub max_duration: i64,
    #[serde(default)]
    pub steps: Vec<ImportStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPlan {
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    #[serde(default)]
    pub is_active: bool,
    #[serde(default)]
    pub start_weekday: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportMeal {
    pub plan_slug: String,
    pub weekday: i64,
    pub name: String,
    pub description: Option<String>,
    pub meal_type: String,
    pub deadline_at: i64,
    pub food_slug: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPayload {
    #[serde(default)]
    pub plans: Vec<ImportPlan>,
    #[serde(default)]
    pub foods: Vec<ImportFood>,
    #[serde(default)]
    pub meals: Vec<ImportMeal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub plans_created: i64,
    pub plans_skipped: i64,
    pub foods_created: i64,
    pub foods_skipped: i64,
    pub meals_created: i64,
    pub meals_skipped: i64,
    pub errors: Vec<String>,
}
