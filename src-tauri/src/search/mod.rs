//! Project-wide content search.
//!
//! Walks the project tree (honoring `.gitignore` and skipping the Forge DB and
//! common build artifacts), matching each text line against a query. Plain
//! queries are treated literally; `is_regex` opts into full regex syntax.
//!
//! This is a fast, dependency-light index-free search suitable for project
//! sizes Forge targets; a persistent index can replace it transparently behind
//! `search_project` later without changing the command surface.

use crate::errors::{ForgeError, Result};
use crate::filesystem::relativize;
use ignore::WalkBuilder;
use regex::RegexBuilder;
use std::path::Path;

const MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;
const DEFAULT_MAX_RESULTS: usize = 1000;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct SearchHit {
    pub path: String,
    /// 1-based line number.
    #[ts(type = "number")]
    pub line: u32,
    /// 1-based column of the first match on the line.
    #[ts(type = "number")]
    pub column: u32,
    pub line_text: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct SearchOptions {
    pub query: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub is_regex: bool,
    #[serde(default)]
    pub max_results: Option<u32>,
}

pub fn search_project(root: &Path, opts: &SearchOptions) -> Result<Vec<SearchHit>> {
    if opts.query.is_empty() {
        return Ok(Vec::new());
    }
    let pattern = if opts.is_regex {
        opts.query.clone()
    } else {
        regex::escape(&opts.query)
    };
    let re = RegexBuilder::new(&pattern)
        .case_insensitive(!opts.case_sensitive)
        .build()
        .map_err(|e| ForgeError::InvalidArgument(format!("invalid search pattern: {e}")))?;

    let max = opts
        .max_results
        .map(|m| m as usize)
        .unwrap_or(DEFAULT_MAX_RESULTS);
    let mut hits = Vec::new();

    let walker = WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .filter_entry(|entry| {
            // Skip the Forge DB and common build dirs to keep results relevant.
            let name = entry.file_name().to_string_lossy();
            !(name == "forge.db"
                || name == "forge.db-wal"
                || name == "forge.db-shm"
                || name == "target"
                || name == "node_modules"
                || name == ".git")
        })
        .build();

    for entry in walker.flatten() {
        if hits.len() >= max {
            break;
        }
        let path = entry.path();
        let Some(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_file() {
            continue;
        }
        if entry.metadata().map(|m| m.len()).unwrap_or(0) > MAX_FILE_BYTES {
            continue;
        }
        let Ok(contents) = std::fs::read(path) else {
            continue;
        };
        let Ok(text) = String::from_utf8(contents) else {
            continue; // skip binary / non-UTF-8
        };
        let rel = relativize(root, path).unwrap_or_else(|| path.to_string_lossy().into_owned());

        for (idx, line) in text.lines().enumerate() {
            if let Some(m) = re.find(line) {
                hits.push(SearchHit {
                    path: rel.clone(),
                    line: (idx + 1) as u32,
                    column: (line[..m.start()].chars().count() + 1) as u32,
                    line_text: line.chars().take(400).collect(),
                });
                if hits.len() >= max {
                    break;
                }
            }
        }
    }

    hits.sort_by(|a, b| a.path.cmp(&b.path).then_with(|| a.line.cmp(&b.line)));
    Ok(hits)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::filesystem::write_file;
    use tempfile::tempdir;

    fn opts(query: &str) -> SearchOptions {
        SearchOptions {
            query: query.into(),
            case_sensitive: false,
            is_regex: false,
            max_results: None,
        }
    }

    #[test]
    fn finds_todo_across_multiple_files() {
        let tmp = tempdir().unwrap();
        write_file(
            tmp.path(),
            "code/a.ino",
            "// TODO: wire sensor\nvoid setup(){}",
        )
        .unwrap();
        write_file(tmp.path(), "code/b.cpp", "int x; // todo later\n// nothing").unwrap();
        write_file(tmp.path(), "code/c.h", "#pragma once").unwrap();

        let hits = search_project(tmp.path(), &opts("TODO")).unwrap();
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].path, "code/a.ino");
        assert_eq!(hits[0].line, 1);
        assert!(hits[0].line_text.contains("TODO"));
        assert_eq!(hits[1].path, "code/b.cpp");
    }

    #[test]
    fn case_sensitive_excludes_lowercase() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "a.txt", "TODO\ntodo").unwrap();
        let mut o = opts("TODO");
        o.case_sensitive = true;
        let hits = search_project(tmp.path(), &o).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 1);
    }

    #[test]
    fn regex_query_matches() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "a.txt", "pin12\npinA0\nground").unwrap();
        let mut o = opts(r"pin\d+");
        o.is_regex = true;
        let hits = search_project(tmp.path(), &o).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].line, 1);
    }

    #[test]
    fn empty_query_returns_nothing() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "a.txt", "anything").unwrap();
        assert!(search_project(tmp.path(), &opts("")).unwrap().is_empty());
    }

    #[test]
    fn column_is_reported_for_match() {
        let tmp = tempdir().unwrap();
        write_file(tmp.path(), "a.txt", "abcNEEDLE").unwrap();
        let hits = search_project(tmp.path(), &opts("NEEDLE")).unwrap();
        assert_eq!(hits[0].column, 4);
    }
}
