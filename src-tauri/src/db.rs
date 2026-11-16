use crate::models::AppResult;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch(MIGRATIONS)?;

        // v1 patch: add start_weekday (idempotent)
        let _ = conn.execute(
            "ALTER TABLE plans ADD COLUMN start_weekday INTEGER NOT NULL DEFAULT 0",
            [],
        );

        // v2 patch: meals.food_id column + plan_meals without UNIQUE(plan_id, weekday)
        let version: i64 = conn
            .query_row(
                "SELECT COALESCE((SELECT CAST(value AS INTEGER) FROM _meta WHERE key='schema_version'), 1)",
                [],
                |r| r.get(0),
            )
            .unwrap_or(1);

        if version < 2 {
            // add food_id to meals (silent no-op if present)
            let _ = conn.execute("ALTER TABLE meals ADD COLUMN food_id INTEGER", []);
            // backfill from meal_foods (first food per meal)
            let _ = conn.execute(
                "UPDATE meals SET food_id = (SELECT food_id FROM meal_foods WHERE meal_id = meals.id LIMIT 1) WHERE food_id IS NULL",
                [],
            );

            // rebuild plan_meals without the UNIQUE(plan_id, weekday) constraint
            let needs_rebuild: bool = conn
                .query_row(
                    "SELECT COALESCE(sql LIKE '%UNIQUE(plan_id, weekday)%', 0) FROM sqlite_master WHERE type='table' AND name='plan_meals'",
                    [],
                    |r| r.get::<_, i64>(0),
                )
                .map(|v| v != 0)
                .unwrap_or(false);

            if needs_rebuild {
                conn.execute_batch(
                    r#"
                    CREATE TABLE IF NOT EXISTS plan_meals_v2 (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        plan_id INTEGER NOT NULL,
                        meal_id INTEGER NOT NULL,
                        weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
                        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                        FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE
                    );
                    INSERT INTO plan_meals_v2 (id, plan_id, meal_id, weekday)
                        SELECT id, plan_id, meal_id, weekday FROM plan_meals;
                    DROP TABLE plan_meals;
                    ALTER TABLE plan_meals_v2 RENAME TO plan_meals;
                    "#,
                )?;
            }

            conn.execute(
                "INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '2')",
                [],
            )?;
        }

        Ok(Db(Mutex::new(conn)))
    }
}

const MIGRATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  min_duration INTEGER NOT NULL DEFAULT 0,
  max_duration INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS food_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  food_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  min_duration INTEGER NOT NULL DEFAULT 0,
  max_duration INTEGER NOT NULL DEFAULT 0,
  offset_time INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(food_id) REFERENCES foods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'breakfast',
  deadline_at INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER
);

CREATE TABLE IF NOT EXISTS plan_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  meal_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  food_id INTEGER NOT NULL,
  FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY(food_id) REFERENCES foods(id) ON DELETE CASCADE,
  UNIQUE(meal_id, food_id)
);
"#;
