use crate::db::Db;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn compute_meal_schedule(meal_id: i64, db: State<'_, Db>) -> AppResult<Vec<ScheduledStep>> {
    let conn = db.0.lock().unwrap();

    let (deadline, food_id): (i64, i64) = conn.query_row(
        "SELECT deadline_at, food_id FROM meals WHERE id = ?1",
        [meal_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let (food_name, max_dur): (String, i64) = conn.query_row(
        "SELECT name, max_duration FROM foods WHERE id = ?1",
        [food_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    let food_start = deadline - max_dur;

    let mut stmt = conn.prepare(
        "SELECT name, description, duration, offset_time FROM food_steps WHERE food_id = ?1 ORDER BY offset_time",
    )?;
    let rows = stmt
        .query_map([food_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, i64>(3)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out: Vec<ScheduledStep> = rows
        .into_iter()
        .map(|(name, desc, dur, offset)| ScheduledStep {
            food_name: food_name.clone(),
            step_name: name,
            step_description: desc,
            notify_at_minutes: food_start + offset,
            duration: dur,
        })
        .collect();
    out.sort_by_key(|s| s.notify_at_minutes);
    Ok(out)
}
