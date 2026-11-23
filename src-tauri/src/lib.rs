mod commands;
mod db;
mod models;
#[cfg(not(target_os = "android"))]
mod scheduler;
mod seed;

use db::Db;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_safe_area_insets_css::init())
        .plugin(tauri_plugin_alarm::init())
        .plugin(tauri_plugin_alarm_scheduler::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("app data dir: {e}"))?;
            let db_path = app_data_dir.join("cookplans.db");
            let db = Db::open(&db_path).map_err(|e| format!("db: {e}"))?;

            {
                let conn = db.0.lock().unwrap();
                seed::seed_if_needed(&conn).map_err(|e| format!("seed: {e}"))?;
            }

            app.manage(db);

            // Desktop only: on Android, alarms are handled by the alarm-scheduler plugin.
            #[cfg(not(target_os = "android"))]
            {
                let handle = app.handle().clone();
                scheduler::start(handle);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::plans::list_plans,
            commands::plans::create_plan,
            commands::plans::update_plan,
            commands::plans::delete_plan,
            commands::plans::set_active_plan,
            commands::meals::list_meals_for_plan,
            commands::meals::get_plan_week_details,
            commands::meals::get_meal,
            commands::meals::get_meal_plan_details,
            commands::meals::create_meal,
            commands::meals::update_meal,
            commands::meals::delete_meal,
            commands::foods::list_foods,
            commands::foods::get_food,
            commands::foods::create_food,
            commands::foods::update_food,
            commands::foods::delete_food,
            commands::foods::list_steps_for_food,
            commands::foods::create_step,
            commands::foods::update_step,
            commands::foods::delete_step,
            commands::schedule::compute_meal_schedule,
            commands::import::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}