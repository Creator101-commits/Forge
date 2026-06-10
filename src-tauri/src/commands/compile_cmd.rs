//! Compile + Upload commands: toolchain detection, compilation, flashing.

use crate::compile::{self, BoardInfo, CompileResult, Toolchain};

#[tauri::command]
pub fn compile_detect_toolchains() -> Vec<Toolchain> {
    compile::detect_toolchains()
}

#[tauri::command]
pub fn compile_sketch(fqbn: String, sketch_dir: String) -> CompileResult {
    compile::compile_arduino(&fqbn, &sketch_dir)
}

#[tauri::command]
pub fn upload_firmware(fqbn: String, port: String, sketch_dir: String) -> CompileResult {
    compile::upload_arduino(&fqbn, &port, &sketch_dir)
}

#[tauri::command]
pub fn compile_list_boards() -> Vec<BoardInfo> {
    compile::list_arduino_boards()
}
