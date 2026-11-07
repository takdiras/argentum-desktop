/// The desktop shell is intentionally thin: the UI is the upstream web client, and the only
/// native capability it needs is the HTTP plugin, which lets it call the Argentum backend without
/// browser CORS restrictions (see `overlay/web-client/src/desktop/installDesktopFetch.ts`).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running Argentum Desktop");
}
