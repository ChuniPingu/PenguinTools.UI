use serde::Deserialize;

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DialogMode {
    File,
    Folder,
    Save,
}

#[derive(Deserialize)]
pub struct FileFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogOptions {
    client_guid: String,
    mode: DialogMode,
    title: Option<String>,
    default_path: Option<String>,
    #[serde(default)]
    filters: Vec<FileFilter>,
}

#[tauri::command]
pub async fn pick_file_dialog(
    window: tauri::WebviewWindow,
    options: DialogOptions,
) -> Result<Option<String>, String> {
    // A dedicated thread owns the STA and all COM objects for the modal dialog.
    // A runtime worker can already be initialized as MTA, so do not reuse one.
    let (sender, mut receiver) = tauri::async_runtime::channel(1);
    std::thread::Builder::new()
        .name("file-dialog".into())
        .spawn(move || {
            let result = show(&window, options);
            let _ = sender.blocking_send(result);
        })
        .map_err(|error| error.to_string())?;
    receiver
        .recv()
        .await
        .ok_or_else(|| "File dialog thread stopped unexpectedly".to_owned())?
}

#[cfg(windows)]
fn show(window: &tauri::WebviewWindow, options: DialogOptions) -> Result<Option<String>, String> {
    let owner = window.hwnd().map_err(|error| error.to_string())?;
    native::show(owner, options).map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn show(window: &tauri::WebviewWindow, options: DialogOptions) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let _ = options.client_guid; // Native history identities are Windows-only.
    let mut dialog = window.dialog().file().set_parent(window);
    if let Some(title) = options.title {
        dialog = dialog.set_title(title);
    }
    if let Some(path) = options.default_path {
        let path = std::path::Path::new(&path);
        if path.is_dir() {
            dialog = dialog.set_directory(path);
        } else {
            if let Some(parent) = path.parent() {
                dialog = dialog.set_directory(parent);
            }
            if let Some(name) = path.file_name() {
                dialog = dialog.set_file_name(name.to_string_lossy());
            }
        }
    }
    if options.mode != DialogMode::Folder {
        for filter in options.filters {
            dialog = dialog.add_filter(filter.name, &filter.extensions);
        }
    }
    let selected = match options.mode {
        DialogMode::File => dialog.blocking_pick_file(),
        DialogMode::Folder => dialog.blocking_pick_folder(),
        DialogMode::Save => dialog.blocking_save_file(),
    };
    selected
        .map(|path| {
            path.into_path()
                .map(|path| path.to_string_lossy().into_owned())
                .map_err(|error| error.to_string())
        })
        .transpose()
}

#[cfg(windows)]
mod native {
    use super::{DialogMode, DialogOptions, FileFilter};
    use std::path::{Path, PathBuf};
    use windows::{
        Win32::{
            Foundation::{ERROR_CANCELLED, HWND},
            System::Com::{
                CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
                CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize,
            },
            UI::Shell::{
                Common::COMDLG_FILTERSPEC, FOS_FILEMUSTEXIST, FOS_FORCEFILESYSTEM, FOS_NOCHANGEDIR,
                FOS_OVERWRITEPROMPT, FOS_PATHMUSTEXIST, FOS_PICKFOLDERS, FileOpenDialog,
                FileSaveDialog, IFileDialog, IShellItem, SHCreateItemFromParsingName,
                SIGDN_FILESYSPATH,
            },
        },
        core::{GUID, HRESULT, HSTRING, PCWSTR, Result},
    };

    struct ComApartment;

    impl ComApartment {
        fn new() -> Result<Self> {
            // SAFETY: The calling thread owns this apartment until the guard drops.
            unsafe {
                CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE).ok()?;
            }
            Ok(Self)
        }
    }

    impl Drop for ComApartment {
        fn drop(&mut self) {
            // SAFETY: Balances the successful initialization, after COM objects drop.
            unsafe { CoUninitialize() };
        }
    }

    // Missing suggested output directories fall back to their closest existing parent.
    fn initial_directory(path: &Path) -> Option<PathBuf> {
        path.ancestors()
            .find(|candidate| candidate.is_dir())
            .map(Path::to_path_buf)
    }

    fn configure(dialog: &IFileDialog, options: &DialogOptions) -> Result<()> {
        // SAFETY: The dialog belongs to this STA; temporary strings live through each call.
        unsafe {
            // SetClientGuid must be the first configuration call. The caller supplies
            // a stable ID independent of translations, file names, and app versions.
            dialog.SetClientGuid(&GUID::try_from(options.client_guid.as_str())?)?;
            let mut flags = dialog.GetOptions()? | FOS_FORCEFILESYSTEM | FOS_NOCHANGEDIR;
            flags |= FOS_PATHMUSTEXIST;
            flags |= match options.mode {
                DialogMode::File => FOS_FILEMUSTEXIST,
                DialogMode::Folder => FOS_PICKFOLDERS,
                DialogMode::Save => FOS_OVERWRITEPROMPT,
            };
            dialog.SetOptions(flags)?;
            if let Some(title) = &options.title {
                dialog.SetTitle(&HSTRING::from(title))?;
            }
            if options.mode != DialogMode::Folder {
                set_filters(dialog, &options.filters)?;
            }
            if let Some(path) = options
                .default_path
                .as_deref()
                .filter(|path| !path.is_empty())
            {
                let path = Path::new(path);
                if let Some(directory) = initial_directory(path) {
                    // A stale/unavailable Shell location must not prevent using history.
                    if let Ok(item) = SHCreateItemFromParsingName::<_, _, IShellItem>(
                        &HSTRING::from(directory.as_os_str()),
                        None,
                    ) {
                        // SetFolder would override the location restored by Windows.
                        dialog.SetDefaultFolder(&item)?;
                    }
                }
                if options.mode == DialogMode::Save
                    && !path.is_dir()
                    && let Some(name) = path.file_name()
                {
                    // Pass only the name so the suggestion cannot override history.
                    dialog.SetFileName(&HSTRING::from(name))?;
                }
            }
        }
        Ok(())
    }

    fn set_filters(dialog: &IFileDialog, filters: &[FileFilter]) -> Result<()> {
        if filters.is_empty() {
            return Ok(());
        }
        let strings: Vec<_> = filters
            .iter()
            .map(|filter| {
                let pattern = filter
                    .extensions
                    .iter()
                    .map(|extension| format!("*.{extension}"))
                    .collect::<Vec<_>>()
                    .join(";");
                (HSTRING::from(&filter.name), HSTRING::from(pattern))
            })
            .collect();
        let specs: Vec<_> = strings
            .iter()
            .map(|(name, pattern)| COMDLG_FILTERSPEC {
                pszName: PCWSTR(name.as_ptr()),
                pszSpec: PCWSTR(pattern.as_ptr()),
            })
            .collect();
        // SAFETY: The backing strings remain alive until SetFileTypes returns.
        unsafe {
            dialog.SetFileTypes(&specs)?;
            if let Some(extension) = filters.first().and_then(|filter| filter.extensions.first()) {
                dialog.SetDefaultExtension(&HSTRING::from(extension))?;
            }
        }
        Ok(())
    }

    pub(super) fn show(owner: HWND, options: DialogOptions) -> Result<Option<String>> {
        let _apartment = ComApartment::new()?;
        // SAFETY: COM is initialized, interfaces stay on this thread, and owner is
        // the invoking Tauri window. The Shell allocation is freed even on decode failure.
        unsafe {
            let class = if options.mode == DialogMode::Save {
                &FileSaveDialog
            } else {
                &FileOpenDialog
            };
            let dialog: IFileDialog = CoCreateInstance(class, None, CLSCTX_INPROC_SERVER)?;
            configure(&dialog, &options)?;
            match dialog.Show(Some(owner)) {
                Err(error) if error.code() == HRESULT::from_win32(ERROR_CANCELLED.0) => Ok(None),
                Err(error) => Err(error),
                Ok(()) => {
                    let path = dialog.GetResult()?.GetDisplayName(SIGDN_FILESYSPATH)?;
                    let decoded = path.to_string();
                    CoTaskMemFree(Some(path.0.cast()));
                    Ok(Some(decoded?))
                }
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn options(mode: DialogMode, default_path: Option<String>) -> DialogOptions {
            DialogOptions {
                client_guid: "06e362c2-21ca-4e54-b6db-c67f6b9f17a8".into(),
                mode,
                title: None,
                default_path,
                filters: vec![FileFilter {
                    name: "谱面".into(),
                    extensions: vec!["c2s".into()],
                }],
            }
        }

        #[test]
        fn suggested_path_falls_back_to_existing_ancestor() {
            let root = std::env::temp_dir();
            let missing = root.join(format!("penguin-dialog-missing-{}", std::process::id()));
            assert!(!missing.exists());
            assert_eq!(initial_directory(&missing.join("输出/new.c2s")), Some(root));
            assert_eq!(initial_directory(Path::new("")), None);
        }

        #[test]
        fn save_suggestion_preserves_an_existing_folder_and_uses_only_the_basename() {
            let _apartment = ComApartment::new().unwrap();
            // No Show call: this verifies native configuration without opening a
            // window or writing test history to the user's Shell settings.
            unsafe {
                let dialog: IFileDialog =
                    CoCreateInstance(&FileSaveDialog, None, CLSCTX_INPROC_SERVER).unwrap();
                let remembered = std::env::temp_dir();
                let item: IShellItem =
                    SHCreateItemFromParsingName(&HSTRING::from(remembered.as_os_str()), None)
                        .unwrap();
                dialog.SetFolder(&item).unwrap();
                let settings = options(
                    DialogMode::Save,
                    Some(
                        std::env::current_dir()
                            .unwrap()
                            .join("新谱面.c2s")
                            .to_string_lossy()
                            .into_owned(),
                    ),
                );
                configure(&dialog, &settings).unwrap();
                let name = dialog.GetFileName().unwrap();
                let decoded = name.to_string().unwrap();
                CoTaskMemFree(Some(name.0.cast()));
                assert_eq!(decoded, "新谱面.c2s");
                let folder = dialog
                    .GetFolder()
                    .unwrap()
                    .GetDisplayName(SIGDN_FILESYSPATH)
                    .unwrap();
                let decoded = folder.to_string().unwrap();
                CoTaskMemFree(Some(folder.0.cast()));
                // Shell paths can expand the temporary directory's 8.3 alias.
                assert_eq!(
                    std::fs::canonicalize(&decoded).unwrap(),
                    std::fs::canonicalize(&remembered).unwrap()
                );
                assert!(dialog.GetOptions().unwrap().contains(FOS_OVERWRITEPROMPT));
            }
        }

        #[test]
        fn open_and_folder_dialogs_keep_required_native_options() {
            let _apartment = ComApartment::new().unwrap();
            for mode in [DialogMode::File, DialogMode::Folder] {
                unsafe {
                    let dialog: IFileDialog =
                        CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER).unwrap();
                    configure(&dialog, &options(mode, None)).unwrap();
                    let flags = dialog.GetOptions().unwrap();
                    assert!(flags.contains(FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST));
                    assert_eq!(flags.contains(FOS_PICKFOLDERS), mode == DialogMode::Folder);
                    if mode == DialogMode::File {
                        assert!(flags.contains(FOS_FILEMUSTEXIST));
                    }
                }
            }
        }
    }
}
