const COMMANDS: &[&str] = &[
    "ring",
    "dismiss",
    "is_alarm_ringing",
    "open_exact_alarm_settings",
    "open_full_screen_intent_settings",
    "get_oem_info",
    "open_autostart_settings",
    "open_xiaomi_battery_settings",
    "open_xiaomi_permissions_editor",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
