use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::error::{Error, Result};
use crate::models::{AlarmArgs, RingingStatus};

pub struct Alarm<R: Runtime> {
    _app: AppHandle<R>,
}

impl<R: Runtime> Alarm<R> {
    pub fn new(app: &AppHandle<R>, _api: PluginApi<R, ()>) -> Result<Self> {
        Ok(Self { _app: app.clone() })
    }

    pub fn ring(&self, _args: AlarmArgs) -> Result<()> {
        Err(Error::UnsupportedPlatform)
    }

    pub fn dismiss(&self) -> Result<()> {
        Err(Error::UnsupportedPlatform)
    }

    pub fn is_alarm_ringing(&self) -> Result<RingingStatus> {
        Ok(RingingStatus { ringing: false })
    }

    pub fn open_exact_alarm_settings(&self) -> Result<()> {
        Ok(())
    }

    pub fn open_full_screen_intent_settings(&self) -> Result<()> {
        Ok(())
    }
}
