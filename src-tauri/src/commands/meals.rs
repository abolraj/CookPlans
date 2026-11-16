use crate::db::Db;
use crate::models::*;
use rusqlite::params;
use tauri::State;

fn row_to_meal(row: &rusqlite::Row<'_>) -> rusqlite::Result<Meal> {
    Ok(Meal {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        meal_type: row.get(3)?,
        deadline_at: row.get(4)?,
        started_at: row.get(5)?,
        food_id: row.get(6)?,
    })
}

fn row_to_food(row: &rusqlite::Row<'_>) -> rusqlite::Result<Food> {
    Ok(Food {
        id: row.get(0)?,
        name: row.get(1)?,
        slug: row.get(2)?,
        description: row.get(3)?,
        min_duration: row.get(4)?,
        max_duration: row.get(5)?,
    })
}

fn fetch_food(conn: &rusqlite::Connection, id: i64) -> rusqlite::Result<Food> {
    conn.query_row(
        "SELECT id, name, slug, description, min_duration, max_duration FROM foods WHERE id = ?1",
        [id],
        row_to_food,
    )
}

fn fetch_food_steps(conn: &rusqlite::Connection, food_id: i64) -> rusqlite::Result<Vec<FoodStep>> {
    let mut stmt = conn.prepare(
        "SELECT id, food_id, name, description, duration, min_duration, max_duration, offset_time
         FROM food_steps WHERE food_id = ?1 ORDER BY offset_time, id",
    )?;
    let rows = stmt.query_map([food_id], |r| {
        Ok(FoodStep {
            id: r.get(0)?,
            food_id: r.get(1)?,
            name: r.get(2)?,
            description: r.get(3)?,
            duration: r.get(4)?,
            min_duration: r.get(5)?,
            max_duration: r.get(6)?,
            offset_time: r.get(7)?,
        })
    })?;
    rows.collect()
}

fn build_details(
    conn: &rusqlite::Connection,
    meal: Meal,
) -> AppResult<MealPlanDetails> {
    let food = fetch_food(conn, meal.food_id)?;
    let cook_start_at = meal.deadline_at - food.max_duration;
    let cook_end_at = meal.deadline_at;
    let steps = fetch_food_steps(conn, food.id)?
        .into_iter()
        .map(|s| {
            let start_at = cook_start_at + s.offset_time;
            MealPlanStep {
                id: s.id,
                name: s.name,
                description: s.description,
                start_at,
                end_at: start_at + s.duration,
                duration: s.duration,
                offset_time: s.offset_time,
            }
        })
        .collect();
    Ok(MealPlanDetails {
        meal,
        food,
        cook_start_at,
        cook_end_at,
        steps,
    })
}

#[tauri::command]
pub fn list_meals_for_plan(plan_id: i64, db: State<'_, Db>) -> AppResult<Vec<MealWithPlanAlias>> {
    // kept for backwards compatibility; wraps week details
    let details = get_plan_week_details(plan_id, db)?;
    Ok(details
        .into_iter()
        .map(|d| MealWithPlanAlias {
            plan_meal_id: d.plan_meal_id,
            weekday: d.weekday,
            meal: d.details.meal,
        })
        .collect())
}

// Minimal shape to keep the old command working if anything still uses it.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MealWithPlanAlias {
    pub plan_meal_id: i64,
    pub weekday: i64,
    pub meal: Meal,
}

#[tauri::command]
pub fn get_plan_week_details(
    plan_id: i64,
    db: State<'_, Db>,
) -> AppResult<Vec<PlanMealDetail>> {
    let conn = db.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT pm.id, pm.weekday, m.id, m.name, m.description, m.type, m.deadline_at, m.started_at, m.food_id
         FROM plan_meals pm JOIN meals m ON m.id = pm.meal_id
         WHERE pm.plan_id = ?1 AND m.food_id IS NOT NULL
         ORDER BY pm.weekday, m.deadline_at, m.id",
    )?;
    let rows: Vec<(i64, i64, Meal)> = stmt
        .query_map([plan_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                Meal {
                    id: row.get(2)?,
                    name: row.get(3)?,
                    description: row.get(4)?,
                    meal_type: row.get(5)?,
                    deadline_at: row.get(6)?,
                    started_at: row.get(7)?,
                    food_id: row.get(8)?,
                },
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(stmt);

    let mut out = Vec::new();
    for (plan_meal_id, weekday, meal) in rows {
        let details = build_details(&conn, meal)?;
        out.push(PlanMealDetail {
            plan_meal_id,
            weekday,
            details,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn get_meal(meal_id: i64, db: State<'_, Db>) -> AppResult<Meal> {
    let conn = db.0.lock().unwrap();
    conn.query_row(
        "SELECT id, name, description, type, deadline_at, started_at, food_id FROM meals WHERE id = ?1",
        [meal_id],
        row_to_meal,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn get_meal_plan_details(meal_id: i64, db: State<'_, Db>) -> AppResult<MealPlanDetails> {
    let conn = db.0.lock().unwrap();
    let meal = conn.query_row(
        "SELECT id, name, description, type, deadline_at, started_at, food_id FROM meals WHERE id = ?1",
        [meal_id],
        row_to_meal,
    )?;
    build_details(&conn, meal)
}

fn compute_started_at(conn: &rusqlite::Connection, food_id: i64, deadline: i64) -> rusqlite::Result<i64> {
    let max_dur: i64 = conn.query_row(
        "SELECT COALESCE(max_duration, 0) FROM foods WHERE id = ?1",
        [food_id],
        |r| r.get(0),
    )?;
    Ok(deadline - max_dur)
}

#[tauri::command]
pub fn create_meal(input: CreateMealInput, db: State<'_, Db>) -> AppResult<Meal> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;

    let started = compute_started_at(&tx, input.food_id, input.deadline_at)?;
    tx.execute(
        "INSERT INTO meals (name, description, type, deadline_at, started_at, food_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![input.name, input.description, input.meal_type, input.deadline_at, started, input.food_id],
    )?;
    let meal_id = tx.last_insert_rowid();
    tx.execute(
        "INSERT INTO plan_meals (plan_id, meal_id, weekday) VALUES (?1, ?2, ?3)",
        params![input.plan_id, meal_id, input.weekday],
    )?;
    tx.commit()?;

    Ok(Meal {
        id: meal_id,
        name: input.name,
        description: input.description,
        meal_type: input.meal_type,
        deadline_at: input.deadline_at,
        started_at: Some(started),
        food_id: input.food_id,
    })
}

#[tauri::command]
pub fn update_meal(input: UpdateMealInput, db: State<'_, Db>) -> AppResult<Meal> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;
    let started = compute_started_at(&tx, input.food_id, input.deadline_at)?;
    tx.execute(
        "UPDATE meals SET name = ?1, description = ?2, type = ?3, deadline_at = ?4, started_at = ?5, food_id = ?6 WHERE id = ?7",
        params![input.name, input.description, input.meal_type, input.deadline_at, started, input.food_id, input.meal_id],
    )?;
    tx.commit()?;
    Ok(Meal {
        id: input.meal_id,
        name: input.name,
        description: input.description,
        meal_type: input.meal_type,
        deadline_at: input.deadline_at,
        started_at: Some(started),
        food_id: input.food_id,
    })
}

#[tauri::command]
pub fn delete_meal(meal_id: i64, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute("DELETE FROM meals WHERE id = ?1", [meal_id])?;
    Ok(())
}
