use crate::db::Db;
use crate::models::*;
use rusqlite::{params, Connection};
use std::collections::HashMap;
use tauri::State;

pub fn run_import(conn: &Connection, payload: &ImportPayload) -> AppResult<ImportResult> {
    let mut result = ImportResult {
        plans_created: 0,
        plans_skipped: 0,
        foods_created: 0,
        foods_skipped: 0,
        meals_created: 0,
        meals_skipped: 0,
        errors: Vec::new(),
    };

    let mut plan_ids: HashMap<String, i64> = HashMap::new();
    for plan in &payload.plans {
        let existing: Option<i64> = conn
            .query_row("SELECT id FROM plans WHERE slug = ?1", [&plan.slug], |r| r.get(0))
            .ok();
        if let Some(id) = existing {
            plan_ids.insert(plan.slug.clone(), id);
            result.plans_skipped += 1;
            continue;
        }
        if plan.is_active {
            conn.execute("UPDATE plans SET is_active = 0", [])?;
        }
        conn.execute(
            "INSERT INTO plans (name, description, slug, is_active) VALUES (?1, ?2, ?3, ?4)",
            params![plan.name, plan.description, plan.slug, if plan.is_active { 1 } else { 0 }],
        )?;
        let id = conn.last_insert_rowid();
        plan_ids.insert(plan.slug.clone(), id);
        result.plans_created += 1;
    }

    let mut food_ids: HashMap<String, i64> = HashMap::new();
    for food in &payload.foods {
        let existing: Option<i64> = conn
            .query_row("SELECT id FROM foods WHERE slug = ?1", [&food.slug], |r| r.get(0))
            .ok();
        if let Some(id) = existing {
            food_ids.insert(food.slug.clone(), id);
            result.foods_skipped += 1;
            continue;
        }
        conn.execute(
            "INSERT INTO foods (name, slug, description, min_duration, max_duration) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![food.name, food.slug, food.description, food.min_duration, food.max_duration],
        )?;
        let id = conn.last_insert_rowid();
        food_ids.insert(food.slug.clone(), id);
        result.foods_created += 1;
        for step in &food.steps {
            conn.execute(
                "INSERT INTO food_steps (food_id, name, description, duration, min_duration, max_duration, offset_time) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, step.name, step.description, step.duration, step.min_duration, step.max_duration, step.offset_time],
            )?;
        }
    }

    for meal in &payload.meals {
        let Some(&plan_id) = plan_ids.get(&meal.plan_slug) else {
            result.errors.push(format!("Meal '{}' references unknown plan '{}'", meal.name, meal.plan_slug));
            result.meals_skipped += 1;
            continue;
        };
        if !["breakfast", "lunch", "dinner", "snack"].contains(&meal.meal_type.as_str()) {
            result.errors.push(format!("Meal '{}' has invalid type '{}'", meal.name, meal.meal_type));
            result.meals_skipped += 1;
            continue;
        }
        if !(0..=6).contains(&meal.weekday) {
            result.errors.push(format!("Meal '{}' has invalid weekday {}", meal.name, meal.weekday));
            result.meals_skipped += 1;
            continue;
        }
        let existing: Option<i64> = conn
            .query_row(
                "SELECT id FROM plan_meals WHERE plan_id = ?1 AND weekday = ?2",
                params![plan_id, meal.weekday],
                |r| r.get(0),
            )
            .ok();
        if existing.is_some() {
            result.errors.push(format!(
                "Meal '{}' skipped: plan '{}' weekday {} already has a meal",
                meal.name, meal.plan_slug, meal.weekday
            ));
            result.meals_skipped += 1;
            continue;
        }
        let mut meal_food_ids: Vec<i64> = Vec::new();
        for slug in &meal.food_slugs {
            match food_ids.get(slug) {
                Some(&id) => meal_food_ids.push(id),
                None => result.errors.push(format!("Meal '{}' references unknown food '{}'", meal.name, slug)),
            }
        }
        let max_dur: i64 = if meal_food_ids.is_empty() {
            0
        } else {
            let placeholders = meal_food_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let sql = format!("SELECT COALESCE(MAX(max_duration), 0) FROM foods WHERE id IN ({placeholders})");
            let params_vec: Vec<Box<dyn rusqlite::ToSql>> = meal_food_ids
                .iter()
                .map(|i| Box::new(*i) as Box<dyn rusqlite::ToSql>)
                .collect();
            let params_ref: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
            conn.query_row(&sql, params_ref.as_slice(), |r| r.get(0))?
        };
        let started_at = meal.deadline_at - max_dur;
        conn.execute(
            "INSERT INTO meals (name, description, type, deadline_at, started_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![meal.name, meal.description, meal.meal_type, meal.deadline_at, started_at],
        )?;
        let meal_id = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO plan_meals (plan_id, meal_id, weekday) VALUES (?1, ?2, ?3)",
            params![plan_id, meal_id, meal.weekday],
        )?;
        for fid in &meal_food_ids {
            conn.execute(
                "INSERT OR IGNORE INTO meal_foods (meal_id, food_id) VALUES (?1, ?2)",
                params![meal_id, fid],
            )?;
        }
        result.meals_created += 1;
    }

    Ok(result)
}

#[tauri::command]
pub fn import_data(payload: ImportPayload, db: State<'_, Db>) -> AppResult<ImportResult> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;
    let result = run_import(&tx, &payload)?;
    tx.commit()?;
    Ok(result)
}
