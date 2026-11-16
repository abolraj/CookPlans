use crate::db::Db;
use chrono::{Datelike, Local, Timelike};
use rusqlite::params;
use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let fired: Mutex<HashSet<String>> = Mutex::new(HashSet::new());
        let mut last_day: u32 = Local::now().ordinal();

        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            let now = Local::now();
            if now.ordinal() != last_day {
                fired.lock().unwrap().clear();
                last_day = now.ordinal();
            }
            if let Err(e) = tick(&app, &fired, &now) {
                eprintln!("[scheduler] {e}");
            }
        }
    });
}

fn tick(
    app: &AppHandle,
    fired: &Mutex<HashSet<String>>,
    now: &chrono::DateTime<Local>,
) -> Result<(), String> {
    let db = app.state::<Db>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let now_min: i64 = (now.hour() as i64) * 60 + (now.minute() as i64);
    // JS weekday: 0=Sunday .. 6=Saturday; chrono weekday num_days_from_sunday matches.
    let weekday: i64 = now.weekday().num_days_from_sunday() as i64;
    let day_key = now.ordinal();

    let active_plan_id: Option<i64> = conn
        .query_row("SELECT id FROM plans WHERE is_active = 1 LIMIT 1", [], |r| r.get(0))
        .ok();

    let Some(plan_id) = active_plan_id else {
        return Ok(());
    };

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.name, m.deadline_at FROM meals m
             JOIN plan_meals pm ON pm.meal_id = m.id
             WHERE pm.plan_id = ?1 AND pm.weekday = ?2",
        )
        .map_err(|e| e.to_string())?;

    let meals: Vec<(i64, String, i64)> = stmt
        .query_map(params![plan_id, weekday], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);

    for (meal_id, meal_name, deadline) in meals {
        let mut fstmt = conn
            .prepare(
                "SELECT f.id, f.name, f.max_duration FROM foods f
                 JOIN meal_foods mf ON mf.food_id = f.id WHERE mf.meal_id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let foods: Vec<(i64, String, i64)> = fstmt
            .query_map([meal_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .map_err(|e| e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        drop(fstmt);

        for (food_id, food_name, food_max) in foods {
            let food_start = deadline - food_max;
            let mut sstmt = conn
                .prepare(
                    "SELECT id, name, description, offset_time FROM food_steps WHERE food_id = ?1 ORDER BY offset_time",
                )
                .map_err(|e| e.to_string())?;
            let steps: Vec<(i64, String, Option<String>, i64)> = sstmt
                .query_map([food_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
                .map_err(|e| e.to_string())?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;
            drop(sstmt);

            for (step_id, step_name, step_desc, offset) in steps {
                let notify_at = food_start + offset;
                // Fire if due within last 60s or next 30s window
                if notify_at > now_min - 1 && notify_at <= now_min {
                    let key = format!("{}-{}-{}-{}", day_key, meal_id, food_id, step_id);
                    let mut set = fired.lock().map_err(|e| e.to_string())?;
                    if set.insert(key) {
                        let title = format!("{} — {} · {}", meal_name, food_name, step_name);
                        let body = step_desc
                            .unwrap_or_else(|| format!("Step for {}", food_name));
                        let _ = app
                            .notification()
                            .builder()
                            .title(&title)
                            .body(&body)
                            .show();
                    }
                }
            }
        }
    }

    Ok(())
}
