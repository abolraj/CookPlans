use crate::commands::import::run_import;
use crate::models::{AppError, AppResult, ImportPayload};
use rusqlite::Connection;

pub fn seed_if_needed(conn: &Connection) -> AppResult<()> {
    let done: Option<String> = conn
        .query_row(
            "SELECT value FROM _meta WHERE key = 'seed_v2'",
            [],
            |r| r.get(0),
        )
        .ok();
    if done.is_some() {
        return Ok(());
    }

    // If the Iranian plan already exists (fresh or user imported), skip.
    let exists: Option<i64> = conn
        .query_row(
            "SELECT id FROM plans WHERE slug = 'irani-week'",
            [],
            |r| r.get(0),
        )
        .ok();

    if exists.is_none() {
        let payload: ImportPayload = serde_json::from_str(include_str!("../seed.json"))
            .map_err(|e| AppError(format!("seed parse: {e}")))?;
        let _ = run_import(conn, &payload)?;
    }

    conn.execute(
        "INSERT OR REPLACE INTO _meta (key, value) VALUES ('seed_v2', 'done')",
        [],
    )?;
    Ok(())
}
