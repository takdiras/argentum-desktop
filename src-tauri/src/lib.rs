mod config;
#[cfg(desktop)]
mod updater;

/// Receives one line per network event from the web client's connection log
/// (`overlay/web-client/src/desktop/connectionLog.ts`) and prints it to stderr. In `bun run dev`
/// that puts every request, and especially every failure, in the terminal.
#[tauri::command]
fn net_log(line: String) {
    eprintln!("[net] {line}");
}

/// The desktop shell is intentionally thin: the UI is the upstream web client. Its one native
/// capability is the HTTP plugin, which lets it call the Argentum backend without browser CORS
/// restrictions (see `overlay/web-client/src/desktop/installDesktopFetch.ts`). Besides that the
/// shell updates itself from GitHub Releases at startup (`updater.rs`), unless `config.json` says
/// `"autoUpdate": false`. That runs entirely in Rust, so the web client gets no new permissions.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![net_log])
        .setup(|app| {
            // Always load, so the config file is created on first run even in `tauri dev`.
            let config = config::Config::load(app.handle());

            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_dialog::init())?;
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                // `tauri dev` runs an unbundled binary that an update could not replace.
                if config.auto_update && !cfg!(debug_assertions) {
                    updater::check_on_launch(app.handle().clone());
                }
            }
            #[cfg(not(desktop))]
            let _ = config;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Argentum Desktop");
}
