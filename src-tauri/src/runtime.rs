use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const RUNTIME_DIR_NAME: &str = "runtime";
const CLI_EXE_NAME: &str = "PenguinTools.CLI.exe";
const REQUIRED_RUNTIME_BINARIES: &[&str] = &[
    "assets/texconv/texconv.exe",
    "assets/ffmpeg/ffmpeg.exe",
    "assets/image-tools/image-tools.exe",
    "assets/image-tools/libvips-42.dll",
];
const MIN_TOOL_BYTES: u64 = 1024 * 1024;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub version: String,
    pub build_date_utc: String,
    pub root: String,
    pub cli_exe: String,
    pub assets_dir: String,
    pub user_data_dir: String,
    pub temp_dir: String,
    pub extracted: bool,
}

pub struct RuntimeLayout {
    pub root: PathBuf,
    pub cli_exe: PathBuf,
    pub assets_dir: PathBuf,
    pub user_data_dir: PathBuf,
    pub temp_dir: PathBuf,
}

pub fn ensure_runtime(app: &AppHandle) -> Result<RuntimeLayout, String> {
    let app_data = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let user_data_dir = app_data.join("user-data");
    let temp_dir = app_data.join("temp");

    fs::create_dir_all(&user_data_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let root = resolve_runtime_source(app)?;
    validate_runtime_layout(&root).map_err(|error| {
        format!(
            "Runtime source failed validation: {error}\n\nRun 'bun run stage:runtime' before building or launching the app."
        )
    })?;

    Ok(RuntimeLayout {
        cli_exe: root.join(CLI_EXE_NAME),
        assets_dir: root.join("assets"),
        root,
        user_data_dir,
        temp_dir,
    })
}

pub fn runtime_info(app: &AppHandle, layout: &RuntimeLayout, extracted: bool) -> RuntimeInfo {
    RuntimeInfo {
        version: app.package_info().version.to_string(),
        build_date_utc: option_env!("APP_BUILD_DATE_UTC")
            .unwrap_or("unknown")
            .to_string(),
        root: layout.root.display().to_string(),
        cli_exe: layout.cli_exe.display().to_string(),
        assets_dir: layout.assets_dir.display().to_string(),
        user_data_dir: layout.user_data_dir.display().to_string(),
        temp_dir: layout.temp_dir.display().to_string(),
        extracted,
    }
}

fn resolve_runtime_source(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_runtime = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join(RUNTIME_DIR_NAME);

    if resource_runtime.is_dir() {
        return Ok(resource_runtime);
    }

    if let Some(project_runtime) = project_staged_runtime_root()
        && project_runtime.is_dir()
    {
        return Ok(project_runtime);
    }

    if let Some(project_runtime) = project_staged_publish_root()
        && project_runtime.is_dir()
    {
        return Ok(project_runtime);
    }

    Err(format!(
        "Runtime payload was not found at '{}'. Initialize submodules and run scripts/stage-runtime.ts before building.",
        resource_runtime.display()
    ))
}

fn project_staged_runtime_root() -> Option<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let runtime_root = manifest_dir.join("resources").join(RUNTIME_DIR_NAME);

    if runtime_root.is_dir() {
        Some(runtime_root)
    } else {
        None
    }
}

fn project_staged_publish_root() -> Option<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let publish_root = manifest_dir
        .join("..")
        .join("external")
        .join("PenguinTools")
        .join("PenguinTools.CLI")
        .join("bin")
        .join("Release")
        .join("net11.0")
        .join("publish");

    for profile in ["WinX64-NativeAOT", "WinX64"] {
        let candidate = publish_root.join(profile);
        if candidate.is_dir() {
            return Some(candidate);
        }
    }

    None
}

fn validate_runtime_layout(runtime_root: &Path) -> Result<(), String> {
    let cli_exe = runtime_root.join(CLI_EXE_NAME);
    if !cli_exe.is_file() {
        return Err(format!(
            "Runtime CLI executable was not found at '{}'.",
            cli_exe.display()
        ));
    }
    validate_pe_executable(&cli_exe)?;

    for name in REQUIRED_RUNTIME_BINARIES {
        let path = runtime_root.join(name);
        if !path.is_file() {
            return Err(format!("Runtime binary '{name}' was not found."));
        }

        let size = fs::metadata(&path).map_err(|e| e.to_string())?.len();
        let minimum_bytes = if name.ends_with("image-tools.exe") {
            MIN_TOOL_BYTES / 8
        } else if name.ends_with("texconv.exe") {
            MIN_TOOL_BYTES / 2
        } else {
            MIN_TOOL_BYTES
        };
        if size < minimum_bytes {
            return Err(format!(
                "Runtime binary '{name}' looks invalid ({size} bytes)."
            ));
        }

        validate_pe_executable(&path)?;
    }

    Ok(())
}

fn validate_pe_executable(path: &Path) -> Result<(), String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() >= 2 && bytes[0] == b'M' && bytes[1] == b'Z' {
        return Ok(());
    }

    Err(format!(
        "'{}' is not a valid Windows executable.",
        path.display()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn validate_runtime_layout_rejects_stub_texconv() {
        let runtime_root = create_valid_runtime();
        fs::write(runtime_root.join("assets/texconv/texconv.exe"), b"stub").unwrap();

        let error = validate_runtime_layout(&runtime_root).unwrap_err();
        assert!(error.contains("texconv.exe"));
        assert!(error.contains("looks invalid"));

        let _ = fs::remove_dir_all(runtime_root);
    }

    fn create_valid_runtime() -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let runtime_root = std::env::temp_dir().join(format!("pb-runtime-valid-{stamp}"));

        fs::create_dir_all(&runtime_root).unwrap();
        fs::write(runtime_root.join("PenguinTools.CLI.exe"), b"MZ").unwrap();
        // Match the staged payload explicitly so obsolete requirements fail this fixture.
        for relative_path in [
            "assets/texconv/texconv.exe",
            "assets/ffmpeg/ffmpeg.exe",
            "assets/image-tools/image-tools.exe",
            "assets/image-tools/libvips-42.dll",
        ] {
            let path = runtime_root.join(relative_path);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            let size = if relative_path.ends_with("image-tools.exe") {
                277_504
            } else {
                MIN_TOOL_BYTES as usize
            };
            let mut bytes = vec![0_u8; size];
            bytes[0] = b'M';
            bytes[1] = b'Z';
            fs::write(path, bytes).unwrap();
        }

        runtime_root
    }

    #[test]
    fn validate_runtime_layout_accepts_image_tools_payload() {
        let runtime_root = create_valid_runtime();

        assert!(!runtime_root.join("assets/mua").exists());
        assert!(!runtime_root.join("assets/cri").exists());
        validate_runtime_layout(&runtime_root).unwrap();

        let _ = fs::remove_dir_all(runtime_root);
    }

    #[test]
    fn validate_runtime_layout_rejects_missing_ffmpeg() {
        let runtime_root = create_valid_runtime();
        fs::remove_file(runtime_root.join("assets/ffmpeg/ffmpeg.exe")).unwrap();

        let error = validate_runtime_layout(&runtime_root).unwrap_err();
        assert!(error.contains("ffmpeg.exe"));
        assert!(error.contains("was not found"));

        let _ = fs::remove_dir_all(runtime_root);
    }

    #[test]
    fn validate_runtime_layout_rejects_stub_ffmpeg() {
        let runtime_root = create_valid_runtime();
        fs::write(runtime_root.join("assets/ffmpeg/ffmpeg.exe"), b"MZ").unwrap();

        let error = validate_runtime_layout(&runtime_root).unwrap_err();
        assert!(error.contains("ffmpeg.exe"));
        assert!(error.contains("looks invalid"));

        let _ = fs::remove_dir_all(runtime_root);
    }

    #[test]
    fn validate_runtime_layout_rejects_non_pe_ffmpeg() {
        let runtime_root = create_valid_runtime();
        fs::write(
            runtime_root.join("assets/ffmpeg/ffmpeg.exe"),
            vec![0_u8; MIN_TOOL_BYTES as usize],
        )
        .unwrap();

        let error = validate_runtime_layout(&runtime_root).unwrap_err();
        assert!(error.contains("ffmpeg.exe"));
        assert!(error.contains("not a valid Windows executable"));

        let _ = fs::remove_dir_all(runtime_root);
    }

    #[test]
    fn validate_runtime_layout_accepts_texconv_under_one_megabyte() {
        let runtime_root = create_valid_runtime();
        let mut bytes = vec![0_u8; (MIN_TOOL_BYTES / 2) as usize];
        bytes[..2].copy_from_slice(b"MZ");
        fs::write(runtime_root.join("assets/texconv/texconv.exe"), bytes).unwrap();
        validate_runtime_layout(&runtime_root).unwrap();
        let _ = fs::remove_dir_all(runtime_root);
    }

    #[test]
    fn validate_runtime_layout_rejects_missing_image_dependencies() {
        for relative_path in [
            "assets/texconv/texconv.exe",
            "assets/image-tools/image-tools.exe",
            "assets/image-tools/libvips-42.dll",
        ] {
            let runtime_root = create_valid_runtime();
            fs::remove_file(runtime_root.join(relative_path)).unwrap();
            let error = validate_runtime_layout(&runtime_root).unwrap_err();
            assert!(error.contains(relative_path));
            assert!(error.contains("was not found"));
            let _ = fs::remove_dir_all(runtime_root);
        }
    }
}
