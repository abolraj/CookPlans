use serde::Serialize;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::error::{Error, Result};
use crate::models::{CancelArgs, PermissionsStatus, ScheduleArgs};

/// Empty payload passed to commands that take no arguments.
#[derive(Serialize)]
struct EmptyArgs {}

pub struct AlarmScheduler<R: Runtime> {
    handle: PluginHandle<R>,
}

impl<R: Runtime> AlarmScheduler<R> {
    pub fn new(_app: &AppHandle<R>, api: PluginApi<R, ()>) -> Result<Self> {
        let handle = api
            .register_android_plugin("com.cookplans.alarmscheduler", "AlarmSchedulerPlugin")
            .map_err(|e| Error::Invoke(format!("{e:?}")))?;
        Ok(Self { handle })
    }

    fn call<T: serde::de::DeserializeOwned>(
        &self,
        cmd: &str,
        args: impl Serialize,
    ) -> Result<T> {
        self.handle
            .run_mobile_plugin::<T>(cmd, args)
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn schedule(&self, a: ScheduleArgs) -> Result<()> {
        self.call("schedule", a)
    }

    pub fn cancel(&self, a: CancelArgs) -> Result<()> {
        self.call("cancel", a)
    }

    pub fn cancel_all(&self) -> Result<()> {
        self.call("cancelAll", EmptyArgs {})
    }

    pub fn check_permissions(&self) -> Result<PermissionsStatus> {
        self.call("checkAlarmPermissions", EmptyArgs {})
    }

    pub fn request_notification_permission(&self) -> Result<()> {
        self.call("requestNotificationPermission", EmptyArgs {})
    }
}