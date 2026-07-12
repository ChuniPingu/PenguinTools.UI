fn main() {
    let build_date = chrono::Local::now().to_rfc3339();
    println!("cargo:rustc-env=APP_BUILD_DATE_UTC={build_date}");
    tauri_build::build()
}
