use base64::Engine;
use std::path::Path;

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "svg" => "image/svg+xml",
        "heic" => "image/heic",
        "heif" => "image/heif",
        _ => "application/octet-stream",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
fn move_to_trash(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let filename = file_path
        .file_name()
        .ok_or_else(|| "Invalid filename".to_string())?
        .to_string_lossy();

    let home = std::env::var("HOME").map_err(|_| "Cannot find HOME directory".to_string())?;
    let trash_dir = Path::new(&home).join(".Trash");

    let mut dest = trash_dir.join(&*filename);

    // Handle name conflicts by appending a timestamp
    if dest.exists() {
        let stem = file_path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        let ext = file_path
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        dest = trash_dir.join(format!("{} {}{}", stem, ts, ext));
    }

    std::fs::rename(&path, &dest).map_err(|e| format!("Failed to move to trash: {}", e))
}

#[cfg(target_os = "macos")]
fn augment_path_for_node() {
    if let Ok(home) = std::env::var("HOME") {
        let current_path = std::env::var("PATH").unwrap_or_default();
        let mut extra_paths: Vec<String> = Vec::new();

        // Find nvm's latest node version
        let nvm_dir = std::path::Path::new(&home).join(".nvm/versions/node");
        if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
            let mut versions: Vec<std::path::PathBuf> =
                entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
            versions.sort();
            if let Some(latest) = versions.last() {
                let bin_dir = latest.join("bin");
                if bin_dir.exists() {
                    extra_paths.push(bin_dir.to_string_lossy().into_owned());
                }
            }
        }

        // Common Homebrew locations
        for dir in &["/opt/homebrew/bin", "/usr/local/bin"] {
            if std::path::Path::new(dir).exists() && !current_path.contains(dir) {
                extra_paths.push(dir.to_string());
            }
        }

        if !extra_paths.is_empty() {
            extra_paths.push(current_path);
            std::env::set_var("PATH", extra_paths.join(":"));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    augment_path_for_node();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![read_file_base64, move_to_trash])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
