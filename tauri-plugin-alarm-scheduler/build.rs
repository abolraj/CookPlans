const COMMANDS: &[&str] = &[
    "schedule",
    "cancel",
    "cancel_all",
    "check_permissions",
    "request_notification_permission",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}