use crate::db::Db;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn compute_meal_schedule(meal_id: i64, db: State<'_, Db>) -> AppResult<Vec<ScheduledStep>> {
    let conn = db.0.lock().unwrap();

    let deadline: i64 = conn.query_row(
        "SELECT deadline_at FROM meals WHERE id = ?1",
        [meal_id],
        |r| r.get(0),
    )?;

    let mut stmt = conn.prepare(
        "SELECT f.id, f.name, f.max_duration FROM foods f
         JOIN meal_foods mf ON mf.food_id = f.id
         WHERE mf.meal_id = ?1",
    )?;
    let foods = stmt
        .query_map([meal_id], |r| {
            Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::new();
    for (fid, fname, fmax) in foods {
        let food_start = deadline - fmax;
        let mut sstmt = conn.prepare(
            "SELECT name, description, duration, offset_time FROM food_steps WHERE food_id = ?1 ORDER BY offset_time",
        )?;
        let steps = sstmt
            .query_map([fid], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<String>>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, i64>(3)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        for (sname, sdesc, sdur, soffset) in steps {
            out.push(ScheduledStep {
                food_name: fname.clone(),
                step_name: sname,
                step_description: sdesc,
                notify_at_minutes: food_start + soffset,
                duration: sdur,
            });
        }
    }
    out.sort_by_key(|s| s.notify_at_minutes);
    Ok(out)
}
