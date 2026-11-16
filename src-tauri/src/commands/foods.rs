use crate::db::Db;
use crate::models::*;
use rusqlite::params;
use tauri::State;

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

fn row_to_step(row: &rusqlite::Row<'_>) -> rusqlite::Result<FoodStep> {
    Ok(FoodStep {
        id: row.get(0)?,
        food_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        duration: row.get(4)?,
        min_duration: row.get(5)?,
        max_duration: row.get(6)?,
        offset_time: row.get(7)?,
    })
}

#[tauri::command]
pub fn list_foods(db: State<'_, Db>) -> AppResult<Vec<Food>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, slug, description, min_duration, max_duration FROM foods ORDER BY name")?;
    let rows = stmt.query_map([], row_to_food)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn get_food(id: i64, db: State<'_, Db>) -> AppResult<Food> {
    let conn = db.0.lock().unwrap();
    conn.query_row(
        "SELECT id, name, slug, description, min_duration, max_duration FROM foods WHERE id = ?1",
        [id],
        row_to_food,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn create_food(input: CreateFoodInput, db: State<'_, Db>) -> AppResult<Food> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "INSERT INTO foods (name, slug, description, min_duration, max_duration) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.name, input.slug, input.description, input.min_duration, input.max_duration],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Food {
        id,
        name: input.name,
        slug: input.slug,
        description: input.description,
        min_duration: input.min_duration,
        max_duration: input.max_duration,
    })
}

#[tauri::command]
pub fn update_food(input: UpdateFoodInput, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "UPDATE foods SET name = ?1, slug = ?2, description = ?3, min_duration = ?4, max_duration = ?5 WHERE id = ?6",
        params![input.name, input.slug, input.description, input.min_duration, input.max_duration, input.id],
    )?;

    // Recompute meals.started_at for all meals using this food
    let mut mstmt = conn.prepare("SELECT id, deadline_at FROM meals WHERE food_id = ?1")?;
    let affected: Vec<(i64, i64)> = mstmt
        .query_map([input.id], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(mstmt);
    for (meal_id, deadline) in affected {
        let started_at = deadline - input.max_duration;
        conn.execute(
            "UPDATE meals SET started_at = ?1 WHERE id = ?2",
            params![started_at, meal_id],
        )?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_food(id: i64, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute("DELETE FROM foods WHERE id = ?1", [id])?;
    Ok(())
}

#[tauri::command]
pub fn list_steps_for_food(food_id: i64, db: State<'_, Db>) -> AppResult<Vec<FoodStep>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, food_id, name, description, duration, min_duration, max_duration, offset_time
         FROM food_steps WHERE food_id = ?1 ORDER BY offset_time, id",
    )?;
    let rows = stmt.query_map([food_id], row_to_step)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn create_step(input: CreateStepInput, db: State<'_, Db>) -> AppResult<FoodStep> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "INSERT INTO food_steps (food_id, name, description, duration, min_duration, max_duration, offset_time)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![input.food_id, input.name, input.description, input.duration, input.min_duration, input.max_duration, input.offset_time],
    )?;
    let id = conn.last_insert_rowid();
    Ok(FoodStep {
        id,
        food_id: input.food_id,
        name: input.name,
        description: input.description,
        duration: input.duration,
        min_duration: input.min_duration,
        max_duration: input.max_duration,
        offset_time: input.offset_time,
    })
}

#[tauri::command]
pub fn update_step(input: UpdateStepInput, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "UPDATE food_steps SET name = ?1, description = ?2, duration = ?3, min_duration = ?4, max_duration = ?5, offset_time = ?6 WHERE id = ?7",
        params![input.name, input.description, input.duration, input.min_duration, input.max_duration, input.offset_time, input.id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn delete_step(id: i64, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute("DELETE FROM food_steps WHERE id = ?1", [id])?;
    Ok(())
}
