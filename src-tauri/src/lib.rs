//! DesignShop — Rust core (Tauri).
//!
//! The UI lives in `../src` (shared with the Electron shell). This crate owns the
//! native side: read/write files, autosave, clipboard images, and small helpers
//! that the web layer cannot do safely on its own.

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Manager, WebviewWindow};

// --------------------------------------------------------------------- types

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BinaryFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub file_name: String,
    pub base64: String,
    #[serde(default)]
    pub filters: Vec<BinaryFilter>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePayload {
    pub file_name: String,
    pub path: String,
    pub base64: String,
    pub mime: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub core: String,
    pub pictures_dir: Option<String>,
}

// ------------------------------------------------------------------- helpers

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "svg" => "image/svg+xml",
        "dshop" | "json" => "application/json",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
}

fn pictures_dir() -> Option<PathBuf> {
    dirs::picture_dir().or_else(dirs::home_dir)
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let trimmed = input.trim();
    // tolerate data URLs: data:image/png;base64,....
    let payload = match trimmed.find(",") {
        Some(idx) if trimmed.starts_with("data:") => &trimmed[idx + 1..],
        _ => trimmed,
    };
    B64.decode(payload).map_err(|e| format!("invalid base64: {e}"))
}

fn unique_path(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("design")
        .to_string();
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    for n in 2..=9999 {
        let candidate = if ext.is_empty() {
            parent.join(format!("{stem} ({n})"))
        } else {
            parent.join(format!("{stem} ({n}).{ext}"))
        };
        if !candidate.exists() {
            return candidate;
        }
    }
    path
}

// ------------------------------------------------------------------- commands

/// Version + platform details for the About panel.
#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "DesignShop".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        core: "Rust · Tauri".into(),
        pictures_dir: pictures_dir().map(|p| p.to_string_lossy().to_string()),
    }
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Show a native save dialog and write the decoded bytes.
/// Returns the chosen path, or `None` when the user cancels.
#[tauri::command]
async fn save_binary(window: WebviewWindow, request: SaveRequest) -> Result<Option<String>, String> {
    let bytes = decode_base64(&request.base64)?;

    let mut dialog = rfd::FileDialog::new()
        .set_title("Save — DesignShop")
        .set_file_name(&request.file_name);
    if let Some(dir) = pictures_dir() {
        dialog = dialog.set_directory(dir);
    }
    for filter in &request.filters {
        let exts: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(&filter.name, &exts);
    }
    dialog = dialog.add_filter("All files", &["*"]);

    let picked = dialog.save_file();
    let Some(path) = picked else {
        return Ok(None);
    };
    let _ = window;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

/// Open a native file picker and return the file as base64.
#[tauri::command]
async fn open_file() -> Result<Option<FilePayload>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title("Open — DesignShop")
        .add_filter(
            "Images & designs",
            &["png", "jpg", "jpeg", "webp", "gif", "bmp", "dshop"],
        )
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "gif", "bmp"])
        .add_filter("DesignShop design", &["dshop"])
        .add_filter("All files", &["*"]);

    let Some(path) = dialog.pick_file() else {
        return Ok(None);
    };
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file")
        .to_string();
    Ok(Some(FilePayload {
        file_name,
        path: path.to_string_lossy().to_string(),
        base64: B64.encode(bytes),
        mime: mime_for(&path).to_string(),
    }))
}

/// Write a `.dshop` project next to the user's pictures (used by autosave).
#[tauri::command]
fn autosave_project(app: tauri::AppHandle, file_name: String, text: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("autosave");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe: String = file_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let path = dir.join(if safe.is_empty() { "autosave.dshop".into() } else { safe });
    fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Save a text file (README exports, SVG copies, etc).
#[tauri::command]
fn save_text(file_name: String, text: String) -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title("Save — DesignShop")
        .set_file_name(&file_name);
    let Some(path) = dialog.save_file() else {
        return Ok(None);
    };
    fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

/// Put a PNG on the system clipboard so "Copy to clipboard" works on desktop.
#[tauri::command]
fn copy_png(base64: String) -> Result<bool, String> {
    let bytes = decode_base64(&base64)?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard
        .set_image(arboard::ImageData {
            width: w as usize,
            height: h as usize,
            bytes: std::borrow::Cow::Owned(rgba.into_raw()),
        })
        .map_err(|e| e.to_string())?;
    Ok(true)
}

/// Reveal a saved file in the system file manager.
#[tauri::command]
fn reveal_path(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    use tauri_plugin_opener::OpenerExt;
    let p = PathBuf::from(&path);
    let target = if p.is_file() {
        p.parent().map(|x| x.to_path_buf()).unwrap_or(p)
    } else {
        p
    };
    app.opener()
        .open_path(target.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

/// Simple health check used by the UI to confirm the Rust core is alive.
#[tauri::command]
fn core_ping() -> String {
    format!(
        "DesignShop Rust core {} on {}/{}",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH
    )
}

/// Copy the current design JSON into the app data folder and return the path.
#[tauri::command]
fn export_project(app: tauri::AppHandle, file_name: String, text: String) -> Result<String, String> {
    let dir = app.path().document_dir().unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = unique_path(dir.join(file_name));
    fs::write(&path, text).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Native "Save as" for an exported image, without a dialog (quick export).
#[tauri::command]
fn save_to_pictures(file_name: String, base64: String) -> Result<String, String> {
    let bytes = decode_base64(&base64)?;
    let dir = pictures_dir().ok_or("no pictures directory")?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = unique_path(dir.join(file_name));
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

// Dialogs use `rfd` directly (same native backend as Tauri's dialog plugin) so
// each command performs pick + read/write in a single IPC round trip.

// ---------------------------------------------------------------------- run

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            app_info,
            app_version,
            core_ping,
            save_binary,
            save_to_pictures,
            open_file,
            autosave_project,
            save_text,
            export_project,
            copy_png,
            reveal_path,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("DesignShop");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running DesignShop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_plain_and_data_url_base64() {
        assert_eq!(decode_base64("aGk=").unwrap(), b"hi");
        assert_eq!(decode_base64("data:image/png;base64,aGk=").unwrap(), b"hi");
        assert!(decode_base64("!!!").is_err());
    }

    #[test]
    fn mime_detection_covers_export_formats() {
        assert_eq!(mime_for(Path::new("a/b.png")), "image/png");
        assert_eq!(mime_for(Path::new("a/b.JPG")), "image/jpeg");
        assert_eq!(mime_for(Path::new("a/b.dshop")), "application/json");
        assert_eq!(mime_for(Path::new("a/b.zip")), "application/zip");
        assert_eq!(mime_for(Path::new("a/b")), "application/octet-stream");
    }

    #[test]
    fn unique_path_avoids_overwrites() {
        let dir = std::env::temp_dir().join(format!("ds_test_{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let first = dir.join("design.png");
        fs::write(&first, b"x").unwrap();
        let next = unique_path(first.clone());
        assert_ne!(next, first);
        assert!(next.to_string_lossy().contains("(2)"));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn core_ping_reports_version() {
        assert!(core_ping().contains("DesignShop Rust core"));
    }
}
