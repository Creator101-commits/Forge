//! Sandboxed filesystem helpers.
//!
//! Every operation is resolved relative to a project root. Paths containing
//! `..`, absolute prefixes, or root components are rejected so the frontend can
//! never escape the active project directory. A `notify`-based watcher emits
//! change events the command layer forwards to the UI.

use crate::errors::{ForgeError, Result};
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct DirEntry {
    pub name: String,
    /// Project-relative path (forward-slashed) usable in subsequent calls.
    pub path: String,
    pub is_dir: bool,
    #[ts(type = "number")]
    pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct FsChange {
    /// `"created" | "modified" | "removed" | "renamed" | "other"`.
    pub kind: String,
    /// Project-relative paths affected.
    pub paths: Vec<String>,
}

/// Resolve a project-relative path against `root`, rejecting any attempt to
/// escape the sandbox. Does not require the target to exist.
pub fn resolve_in_root(root: &Path, rel: &str) -> Result<PathBuf> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err(ForgeError::InvalidArgument(format!(
            "absolute paths are not allowed: {rel}"
        )));
    }
    let mut out = root.to_path_buf();
    for comp in rel_path.components() {
        match comp {
            Component::Normal(seg) => out.push(seg),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(ForgeError::InvalidArgument(format!(
                    "path traversal is not allowed: {rel}"
                )));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(ForgeError::InvalidArgument(format!(
                    "invalid path component in: {rel}"
                )));
            }
        }
    }
    Ok(out)
}

/// Convert an absolute path under `root` back into a forward-slashed
/// project-relative string. Returns None if `path` is not under `root`.
pub fn relativize(root: &Path, path: &Path) -> Option<String> {
    let rel = path.strip_prefix(root).ok()?;
    let s = rel
        .components()
        .filter_map(|c| match c {
            Component::Normal(seg) => Some(seg.to_string_lossy().into_owned()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/");
    Some(s)
}

pub fn read_file(root: &Path, rel: &str) -> Result<String> {
    let path = resolve_in_root(root, rel)?;
    if !path.exists() {
        return Err(ForgeError::NotFound(format!("file not found: {rel}")));
    }
    let bytes = fs::read(&path)?;
    String::from_utf8(bytes)
        .map_err(|_| ForgeError::InvalidArgument(format!("file is not valid UTF-8: {rel}")))
}

/// Write `contents` to `rel`, creating parent directories. The write is atomic
/// (temp file + rename) so a crash never leaves a half-written file.
pub fn write_file(root: &Path, rel: &str, contents: &str) -> Result<()> {
    let path = resolve_in_root(root, rel)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension(format!(
        "{}.tmp",
        path.extension().and_then(|e| e.to_str()).unwrap_or("")
    ));
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(contents.as_bytes())?;
        f.sync_all()?;
    }
    fs::rename(&tmp, &path)?;
    Ok(())
}

pub fn list_dir(root: &Path, rel: &str) -> Result<Vec<DirEntry>> {
    let dir = resolve_in_root(root, rel)?;
    if !dir.is_dir() {
        return Err(ForgeError::NotFound(format!("not a directory: {rel}")));
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(&dir)? {
        let entry = entry?;
        let meta = entry.metadata()?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let path = relativize(root, &entry.path()).unwrap_or_else(|| name.clone());
        entries.push(DirEntry {
            name,
            path,
            is_dir: meta.is_dir(),
            size: if meta.is_dir() { 0 } else { meta.len() },
        });
    }
    // Directories first, then case-insensitive name order.
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

pub fn rename_path(root: &Path, from: &str, to: &str) -> Result<()> {
    let from_p = resolve_in_root(root, from)?;
    let to_p = resolve_in_root(root, to)?;
    if !from_p.exists() {
        return Err(ForgeError::NotFound(format!("path not found: {from}")));
    }
    if let Some(parent) = to_p.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&from_p, &to_p)?;
    Ok(())
}

pub fn delete_path(root: &Path, rel: &str) -> Result<()> {
    let path = resolve_in_root(root, rel)?;
    if !path.exists() {
        return Err(ForgeError::NotFound(format!("path not found: {rel}")));
    }
    if path.is_dir() {
        fs::remove_dir_all(&path)?;
    } else {
        fs::remove_file(&path)?;
    }
    Ok(())
}

pub mod watcher;

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn rejects_parent_traversal_and_absolute() {
        let root = Path::new("/tmp/forge-root");
        assert!(resolve_in_root(root, "../etc/passwd").is_err());
        assert!(resolve_in_root(root, "a/../../b").is_err());
        assert!(resolve_in_root(root, "/etc/passwd").is_err());
        // Normal nested path is fine.
        let ok = resolve_in_root(root, "code/main.ino").unwrap();
        assert!(ok.ends_with("code/main.ino"));
    }

    #[test]
    fn write_read_roundtrip_and_creates_parents() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "code/sketch/main.ino", "void setup(){}").unwrap();
        assert_eq!(
            read_file(tmp.path(), "code/sketch/main.ino").unwrap(),
            "void setup(){}"
        );
    }

    #[test]
    fn read_missing_is_not_found() {
        let tmp = tempdir().unwrap();
        assert_eq!(
            read_file(tmp.path(), "nope.txt").unwrap_err().code(),
            "not_found"
        );
    }

    #[test]
    fn list_dir_sorts_dirs_first() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "b.txt", "x").unwrap();
        write_file(tmp.path(), "a.txt", "x").unwrap();
        write_file(tmp.path(), "dir/inner.txt", "x").unwrap();
        let entries = list_dir(tmp.path(), "").unwrap();
        let names: Vec<_> = entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["dir", "a.txt", "b.txt"]);
        assert!(entries[0].is_dir);
    }

    #[test]
    fn rename_and_delete() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "a.txt", "hello").unwrap();
        rename_path(tmp.path(), "a.txt", "b.txt").unwrap();
        assert!(read_file(tmp.path(), "a.txt").is_err());
        assert_eq!(read_file(tmp.path(), "b.txt").unwrap(), "hello");

        delete_path(tmp.path(), "b.txt").unwrap();
        assert!(read_file(tmp.path(), "b.txt").is_err());
    }

    #[test]
    fn traversal_rejected_on_all_ops() {
        let tmp = tempdir().unwrap();
        assert!(write_file(tmp.path(), "../escape.txt", "x").is_err());
        assert!(read_file(tmp.path(), "../escape.txt").is_err());
        assert!(delete_path(tmp.path(), "../escape.txt").is_err());
        assert!(rename_path(tmp.path(), "../a", "b").is_err());
    }
}
