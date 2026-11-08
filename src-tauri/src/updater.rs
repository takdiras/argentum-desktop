//! Checks GitHub Releases for a newer version when the app starts and installs it in the background.
//!
//! The installed update takes effect on the next launch. Restarting by ourselves could cut off a
//! game that has already begun while the download was running, so the user is asked instead. On
//! Windows the installer closes the app itself, as part of installing.
//!
//! Releases are signed with the key whose public half is in `tauri.conf.json` (`plugins.updater`);
//! the plugin refuses anything that does not verify against it.

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

/// Starts the check in the background. Returns at once; failures (offline, no release yet, rate
/// limit) are logged and otherwise ignored, because an update check must never get in the way of
/// playing.
pub fn check_on_launch(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        if let Err(e) = check_and_install(&app).await {
            eprintln!("[update] check failed: {e}");
        }
    });
}

async fn check_and_install(app: &AppHandle) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        eprintln!("[update] already on the latest version");
        return Ok(());
    };
    let version = update.version.clone();
    eprintln!("[update] {} -> {version}: downloading", update.current_version);

    update
        .download_and_install(|_chunk, _total| {}, || eprintln!("[update] downloaded, installing"))
        .await?;
    eprintln!("[update] {version} installed");

    let restart_app = app.clone();
    app.dialog()
        .message(format!(
            "Argentum Desktop {version} has been installed.\n\nRestart now to use it? Otherwise it starts the next time you open the app."
        ))
        .title("Update installed")
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Restart now".into(),
            "Later".into(),
        ))
        .show(move |restart| {
            if restart {
                restart_app.restart();
            }
        });
    Ok(())
}
