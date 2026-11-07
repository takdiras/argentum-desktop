/// Receives one line per network event from the web client's connection log
/// (`overlay/web-client/src/desktop/connectionLog.ts`) and prints it to stderr. In `bun run dev`
/// that puts every request, and especially every failure, in the terminal.
#[tauri::command]
fn net_log(line: String) {
    eprintln!("[net] {line}");
}

/// The desktop shell is intentionally thin: the UI is the upstream web client, and the only
/// native capability it needs is the HTTP plugin, which lets it call the Argentum backend without
/// browser CORS restrictions (see `overlay/web-client/src/desktop/installDesktopFetch.ts`).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![net_log])
        .run(tauri::generate_context!())
        .expect("error while running Argentum Desktop");
}
