use crate::db::Db;
use crate::models::*;
use tauri::State;

fn row_to_plan(row: &rusqlite::Row<'_>) -> rusqlite::Result<Plan> {
    Ok(Plan {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        slug: row.get(3)?,
        is_active: row.get::<_, i64>(4)? != 0,
        start_weekday: row.get(5)?,
    })
}

#[tauri::command]
pub fn list_plans(db: State<'_, Db>) -> AppResult<Vec<Plan>> {
    let conn = db.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, description, slug, is_active, start_weekday FROM plans ORDER BY id DESC",
    )?;
    let rows = stmt.query_map([], row_to_plan)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

#[tauri::command]
pub fn create_plan(input: CreatePlanInput, db: State<'_, Db>) -> AppResult<Plan> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "INSERT INTO plans (name, description, slug, is_active, start_weekday) VALUES (?1, ?2, ?3, 0, ?4)",
        rusqlite::params![input.name, input.description, input.slug, input.start_weekday],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Plan {
        id,
        name: input.name,
        description: input.description,
        slug: input.slug,
        is_active: false,
        start_weekday: input.start_weekday,
    })
}

#[tauri::command]
pub fn update_plan(input: UpdatePlanInput, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute(
        "UPDATE plans SET name = ?1, description = ?2, slug = ?3, start_weekday = ?4 WHERE id = ?5",
        rusqlite::params![input.name, input.description, input.slug, input.start_weekday, input.id],
    )?;
    Ok(())
}

#[tauri::command]
pub fn delete_plan(id: i64, db: State<'_, Db>) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    conn.execute("DELETE FROM plans WHERE id = ?1", [id])?;
    Ok(())
}

#[tauri::command]
pub fn set_active_plan(id: i64, db: State<'_, Db>) -> AppResult<()> {
    let mut conn = db.0.lock().unwrap();
    let tx = conn.transaction()?;
    tx.execute("UPDATE plans SET is_active = 0", [])?;
    tx.execute("UPDATE plans SET is_active = 1 WHERE id = ?1", [id])?;
    tx.commit()?;
    Ok(())
}
