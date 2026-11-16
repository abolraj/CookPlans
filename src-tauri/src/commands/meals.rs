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
    })
}

fn compute_started_at(conn: &rusqlite::Connection, food_ids: &[i64], deadline: i64) -> rusqlite::Result<i64> {
    if food_ids.is_empty() {
        return Ok(deadline);
    }
    let placeholders = food_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!("SELECT COALESCE(MAX(max_duration), 0) FROM foods WHERE id IN ({placeholders})");
    let params_vec: Vec<Box<dyn rusqlite::ToSql>> = food_ids.iter().map(|i| Box::new(*i) as Box<dyn rusqlite::ToSql>).collect();
    let params_ref: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let max_dur: i64 = conn.query_row(&sql, params_ref.as_slice(), |r| r.get(0))?;
    Ok(deadline - max_dur)
}

#[tauri::command]
pub fn list_meals_for_plan(plan_id: i64, db: State<'_, Db>) -> AppResult<Vec<MealWithPlan>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT pm.id, pm.weekday, m.id, m.name, m.description, m.type, m.deadline_at, m.started_at
         FROM plan_meals pm JOIN meals m ON m.id = pm.meal_id
         WHERE pm.plan_id = ?1
         ORDER BY pm.weekday",
    )?;
    let rows = stmt.query_map([plan_id], |row| {
        Ok(MealWithPlan {
            plan_meal_id: row.get(0)?,
            weekday: row.get(1)?,
            meal: Meal {
                id: row.get(2)?,
                name: row.get(3)?,
                description: row.get(4)?,
                meal_type: row.get(5)?,
                deadline_at: row.get(6)?,
                started_at: row.get(7)?,
            },
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn get_meal(meal_id: i64, db: State<'_, Db>) -> AppResult<Meal> {
    let conn = db.0.lock().unwrap();
    conn.query_row(
        "SELECT id, name, description, type, deadline_at, started_at FROM meals WHERE id = ?1",
        [meal_id],
        row_to_meal,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn get_meal_food_ids(meal_id: i64, db: State<'_, Db>) -> AppResult<Vec<i64>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT food_id FROM meal_foods WHERE meal_id = ?1")?;
    let rows = stmt.query_map([meal_id], |r| r.get::<_, i64>(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn create_meal(input: CreateMealInput, db: State<'_, Db>) -> AppResult<Meal> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;

    let exists: Option<i64> = tx
        .query_row(
            "SELECT id FROM plan_meals WHERE plan_id = ?1 AND weekday = ?2",
            params![input.plan_id, input.weekday],
            |r| r.get(0),
        )
        .ok();
    if exists.is_some() {
        return Err(AppError("This day already has a meal. Edit or delete it first.".into()));
    }

    let started = compute_started_at(&tx, &input.food_ids, input.deadline_at)?;
    tx.execute(
        "INSERT INTO meals (name, description, type, deadline_at, started_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.name, input.description, input.meal_type, input.deadline_at, started],
    )?;
    let meal_id = tx.last_insert_rowid();
    tx.execute(
        "INSERT INTO plan_meals (plan_id, meal_id, weekday) VALUES (?1, ?2, ?3)",
        params![input.plan_id, meal_id, input.weekday],
    )?;
    for fid in &input.food_ids {
        tx.execute(
            "INSERT OR IGNORE INTO meal_foods (meal_id, food_id) VALUES (?1, ?2)",
            params![meal_id, fid],
        )?;
    }
    tx.commit()?;
    Ok(Meal {
        id: meal_id,
        name: input.name,
        description: input.description,
        meal_type: input.meal_type,
        deadline_at: input.deadline_at,
        started_at: Some(started),
    })
}

#[tauri::command]
pub fn update_meal(input: UpdateMealInput, db: State<'_, Db>) -> AppResult<Meal> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;
    let started = compute_started_at(&tx, &input.food_ids, input.deadline_at)?;
    tx.execute(
        "UPDATE meals SET name = ?1, description = ?2, type = ?3, deadline_at = ?4, started_at = ?5 WHERE id = ?6",
        params![input.name, input.description, input.meal_type, input.deadline_at, started, input.meal_id],
    )?;
    tx.execute("DELETE FROM meal_foods WHERE meal_id = ?1", [input.meal_id])?;
    for fid in &input.food_ids {
        tx.execute(
            "INSERT INTO meal_foods (meal_id, food_id) VALUES (?1, ?2)",
            params![input.meal_id, fid],
        )?;
    }
    tx.commit()?;
    Ok(Meal {
        id: input.meal_id,
        name: input.name,
        description: input.description,
        meal_type: input.meal_type,
        deadline_at: input.deadline_at,
        started_at: Some(started),
    })
}

#[tauri::command]
pub fn delete_meal(meal_id: i64, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute("DELETE FROM meals WHERE id = ?1", [meal_id])?;
    Ok(())
}
