use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime, Wry,
};

mod desktop;
mod error;
mod mobile;
mod models;

pub use error::{Error, Result};
pub use models::{AlarmArgs, RingingStatus};

#[cfg(desktop)]
pub use desktop::Alarm;
#[cfg(mobile)]
pub use mobile::Alarm;

pub trait AlarmExt<R: Runtime> {
    fn alarm(&self) -> &Alarm<R>;
}

impl<R: Runtime, T: Manager<R>> AlarmExt<R> for T {
    fn alarm(&self) -> &Alarm<R> {
        self.state::<Alarm<R>>().inner()
    }
}

#[tauri::command]
async fn ring(app: AppHandle, args: AlarmArgs) -> Result<()> {
    app.alarm().ring(args)
}

#[tauri::command]
async fn dismiss(app: AppHandle) -> Result<()> {
    app.alarm().dismiss()
}

#[tauri::command]
async fn is_alarm_ringing(app: AppHandle) -> Result<RingingStatus> {
    app.alarm().is_alarm_ringing()
}

#[tauri::command]
async fn open_exact_alarm_settings(app: AppHandle) -> Result<()> {
    app.alarm().open_exact_alarm_settings()
}

#[tauri::command]
async fn open_full_screen_intent_settings(app: AppHandle) -> Result<()> {
    app.alarm().open_full_screen_intent_settings()
}

pub fn init() -> TauriPlugin<Wry> {
    Builder::<Wry>::new("alarm")
        .invoke_handler(tauri::generate_handler![
            ring,
            dismiss,
            is_alarm_ringing,
            open_exact_alarm_settings,
            open_full_screen_intent_settings,
        ])
        .setup(|app, api| {
            let alarm = Alarm::new(app, api)?;
            app.manage(alarm);
            Ok(())
        })
        .build()
}