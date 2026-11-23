use tauri::{plugin::{Builder, TauriPlugin}, AppHandle, Manager, Runtime, Wry};

mod desktop; mod error; mod mobile; mod models;
pub use error::{Error, Result};
pub use models::{CancelArgs, PermissionsStatus, ScheduleArgs};

#[cfg(desktop)] pub use desktop::AlarmScheduler;
#[cfg(mobile)]  pub use mobile::AlarmScheduler;

pub trait AlarmSchedulerExt<R: Runtime> { fn alarm_scheduler(&self) -> &AlarmScheduler<R>; }
impl<R: Runtime, T: Manager<R>> AlarmSchedulerExt<R> for T {
    fn alarm_scheduler(&self) -> &AlarmScheduler<R> { self.state::<AlarmScheduler<R>>().inner() }
}

#[tauri::command] async fn schedule(app: AppHandle, args: ScheduleArgs) -> Result<()> { app.alarm_scheduler().schedule(args) }
#[tauri::command] async fn cancel(app: AppHandle, args: CancelArgs) -> Result<()> { app.alarm_scheduler().cancel(args) }
#[tauri::command] async fn cancel_all(app: AppHandle) -> Result<()> { app.alarm_scheduler().cancel_all() }
#[tauri::command] async fn check_permissions(app: AppHandle) -> Result<PermissionsStatus> { app.alarm_scheduler().check_permissions() }
#[tauri::command] async fn request_notification_permission(app: AppHandle) -> Result<()> { app.alarm_scheduler().request_notification_permission() }

pub fn init() -> TauriPlugin<Wry> {
    Builder::<Wry>::new("alarm-scheduler")
        .invoke_handler(tauri::generate_handler![
            schedule, cancel, cancel_all, check_permissions, request_notification_permission
        ])
        .setup(|app, api| { app.manage(AlarmScheduler::new(app, api)?); Ok(()) })
        .build()
}