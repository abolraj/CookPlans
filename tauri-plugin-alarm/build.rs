const COMMANDS: &[&str] = &[
    "ring",
    "dismiss",
    "is_alarm_ringing",
    "open_exact_alarm_settings",
    "open_full_screen_intent_settings",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}