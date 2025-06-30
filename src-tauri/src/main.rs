// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::fs;

// 获取应用数据目录
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    match app.path().app_data_dir() {
        Ok(dir) => {
            // 确保目录存在
            if let Err(e) = fs::create_dir_all(&dir) {
                return Err(format!("创建数据目录失败: {}", e));
            }
            Ok(dir.to_string_lossy().into_owned())
        }
        Err(e) => Err(format!("无法获取应用数据目录: {}", e))
    }
}

// 保存数据到文件
#[tauri::command]
fn save_data(app: tauri::AppHandle, filename: String, data: String) -> Result<(), String> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("无法获取应用数据目录: {}", e))
    };
    
    // 确保目录存在
    if let Err(e) = fs::create_dir_all(&app_data_dir) {
        return Err(format!("创建数据目录失败: {}", e));
    }
    
    let file_path = app_data_dir.join(filename);
    match fs::write(file_path, data) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("保存文件失败: {}", e))
    }
}

// 从文件读取数据
#[tauri::command]
fn load_data(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => return Err(format!("无法获取应用数据目录: {}", e))
    };
    
    let file_path = app_data_dir.join(filename);
    match fs::read_to_string(file_path) {
        Ok(content) => Ok(content),
        Err(_) => Ok("{}".to_string()) // 文件不存在时返回空对象
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_app_data_dir, save_data, load_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
