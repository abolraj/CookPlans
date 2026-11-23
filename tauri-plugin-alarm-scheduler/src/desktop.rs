use tauri::{plugin::PluginApi, AppHandle, Runtime};
use crate::error::{Error, Result};
use crate::models::{CancelArgs, PermissionsStatus, ScheduleArgs};

pub struct AlarmScheduler<R: Runtime> { _app: AppHandle<R> }

impl<R: Runtime> AlarmScheduler<R> {
    pub fn new(app: &AppHandle<R>, _api: PluginApi<R, ()>) -> Result<Self> {
        Ok(Self { _app: app.clone() })
    }
    pub fn schedule(&self, _a: ScheduleArgs) -> Result<()> { Err(Error::UnsupportedPlatform) }
    pub fn cancel(&self, _a: CancelArgs) -> Result<()> { Err(Error::UnsupportedPlatform) }
    pub fn cancel_all(&self) -> Result<()> { Err(Error::UnsupportedPlatform) }
    pub fn check_permissions(&self) -> Result<PermissionsStatus> {
        Ok(PermissionsStatus { notifications_granted: true, exact_alarm_granted: true, full_screen_intent_granted: true })
    }
    pub fn request_notification_permission(&self) -> Result<()> { Ok(()) }
}