use serde::Serialize;
use tauri::{
    AppHandle, Runtime,
    plugin::{PluginApi, PluginHandle},
};

use crate::error::{Error, Result};
use crate::models::{AlarmArgs, OemInfo, RingingStatus};

#[derive(Serialize)]
struct EmptyArgs {}

pub struct Alarm<R: Runtime> {
    handle: PluginHandle<R>,
}

impl<R: Runtime> Alarm<R> {
    pub fn new(_app: &AppHandle<R>, api: PluginApi<R, ()>) -> Result<Self> {
        let handle = api
            .register_android_plugin("com.cookplans.alarm", "AlarmPlugin")
            .map_err(|e| Error::Invoke(format!("{e:?}")))?;
        Ok(Self { handle })
    }

    pub fn ring(&self, args: AlarmArgs) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("ring", args)
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn dismiss(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("dismiss", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn is_alarm_ringing(&self) -> Result<RingingStatus> {
        self.handle
            .run_mobile_plugin::<RingingStatus>("isAlarmRinging", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn open_exact_alarm_settings(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("openExactAlarmSettings", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn open_full_screen_intent_settings(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("openFullScreenIntentSettings", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn get_oem_info(&self) -> Result<OemInfo> {
        self.handle
            .run_mobile_plugin::<OemInfo>("getOemInfo", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn open_autostart_settings(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("openAutostartSettings", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn open_xiaomi_battery_settings(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("openXiaomiBatterySettings", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }

    pub fn open_xiaomi_permissions_editor(&self) -> Result<()> {
        self.handle
            .run_mobile_plugin::<()>("openXiaomiPermissionsEditor", EmptyArgs {})
            .map_err(|e| Error::Invoke(e.to_string()))
    }
}
