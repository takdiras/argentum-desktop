//! User-editable settings, read from `config.json` in the app's config directory
//! (`~/Library/Application Support/com.takdiras.argentum-desktop/` on macOS,
//! `%APPDATA%\com.takdiras.argentum-desktop\` on Windows, `~/.config/com.takdiras.argentum-desktop/`
//! on Linux).
//!
//! The file is created with the defaults the first time the app starts, so there is something to
//! edit. Missing keys fall back to their default, so a config written by an older version keeps
//! working after new settings are added.

use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Manager};

const FILE_NAME: &str = "config.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Config {
    /// Check GitHub for a newer release when the app starts, and install it in the background.
    pub auto_update: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self { auto_update: true }
    }
}

impl Config {
    fn parse(text: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(text)
    }

    /// Loads the config, writing the defaults to disk when the file does not exist yet.
    ///
    /// Never fails: a broken or unreadable file yields the defaults and is left untouched, so a
    /// typo in `config.json` cannot lose the user's other settings or stop the app from starting.
    pub fn load(app: &AppHandle) -> Self {
        let Ok(dir) = app.path().app_config_dir() else {
            return Self::default();
        };
        Self::load_from(&dir.join(FILE_NAME))
    }

    fn load_from(path: &Path) -> Self {
        match std::fs::read_to_string(path) {
            Ok(text) => Self::parse(&text).unwrap_or_else(|e| {
                eprintln!("[config] ignoring {}: {e}", path.display());
                Self::default()
            }),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                let config = Self::default();
                config.write_defaults(path);
                config
            }
            Err(e) => {
                eprintln!("[config] cannot read {}: {e}", path.display());
                Self::default()
            }
        }
    }

    fn write_defaults(&self, path: &Path) {
        let result = path
            .parent()
            .map_or(Ok(()), std::fs::create_dir_all)
            .and_then(|()| {
                let mut text = serde_json::to_string_pretty(self).expect("config serializes");
                text.push('\n');
                std::fs::write(path, text)
            });
        if let Err(e) = result {
            eprintln!("[config] cannot write {}: {e}", path.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_update_defaults_to_on() {
        assert!(Config::default().auto_update);
        assert!(Config::parse("{}").unwrap().auto_update);
    }

    #[test]
    fn auto_update_can_be_turned_off() {
        assert!(!Config::parse(r#"{ "autoUpdate": false }"#).unwrap().auto_update);
    }

    #[test]
    fn unknown_keys_are_ignored() {
        assert!(Config::parse(r#"{ "somethingNew": 1 }"#).unwrap().auto_update);
    }

    #[test]
    fn wrong_type_is_an_error_not_a_silent_default() {
        assert!(Config::parse(r#"{ "autoUpdate": "no" }"#).is_err());
    }

    #[test]
    fn first_run_writes_the_defaults_and_keeps_edits_afterwards() {
        let dir = std::env::temp_dir().join(format!("argentum-config-test-{}", std::process::id()));
        let path = dir.join("nested").join(FILE_NAME);
        let _ = std::fs::remove_dir_all(&dir);

        assert!(Config::load_from(&path).auto_update);
        let written = std::fs::read_to_string(&path).unwrap();
        assert!(written.contains("\"autoUpdate\": true"), "{written}");

        std::fs::write(&path, r#"{ "autoUpdate": false }"#).unwrap();
        assert!(!Config::load_from(&path).auto_update);

        // A file that no longer parses is not overwritten, and the defaults apply.
        std::fs::write(&path, "{ nope").unwrap();
        assert!(Config::load_from(&path).auto_update);
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "{ nope");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
