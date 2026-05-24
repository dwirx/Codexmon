mod codex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            codex::get_codex_usage_snapshot,
            codex::get_account_manager_state,
            codex::get_multi_account_usage,
            codex::import_current_account,
            codex::get_storage_cache_state,
            codex::clear_local_cache,
            codex::switch_account_profile,
            codex::remove_account_profile,
            codex::logout_codex_session,
            codex::open_codex_login
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
