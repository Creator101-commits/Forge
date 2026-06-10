# Copilot Instructions for Forge

This file contains repository-specific instructions to help GitHub Copilot and other AI assistants work effectively in this codebase.

## Build, Test, and Lint Commands

The project uses `pnpm` for the frontend and `cargo` for the Rust/Tauri backend.

### Frontend (Node 20+)
- **Install dependencies:** `pnpm install`
- **Run dev server:** `pnpm tauri:dev`
- **Lint:** `pnpm lint` and `pnpm typecheck`
- **Format:** `pnpm format:check`
- **Run all tests:** `pnpm test`
- **Run a single test:** `pnpm vitest run <path/to/test.ts>`

### Backend (`src-tauri` directory)
- **Lint:** `cargo clippy --all-targets -- -D warnings`
- **Format:** `cargo fmt --check`
- **Run all tests:** `cargo test --lib`
- **Run a single test:** `cargo test --lib <test_name>`

## High-Level Architecture

Forge is a desktop application built on **Tauri 2**, with a **Rust** backend and a **React/TypeScript** frontend.

- **Frontend (`src/`):** Uses React, TypeScript, and Vite. State is managed via Zustand slices (e.g., UI, project, settings). Styling uses Tailwind CSS powered by custom design tokens mapped to CSS variables (`src/styles/tokens.css`).
- **Backend (`src-tauri/`):** Handles core logic, filesystem operations, and database access. Commands are exposed to the frontend via Tauri's IPC mechanism.
- **Persistence:** 
  - **Project level:** Projects are stored as directories containing `forge-project.json` (human-readable state) and `forge.db` (per-project SQLite for events and indexing).
  - **User level:** App settings and recent projects reside in `forge-user.db` in the OS data directory, completely separate from projects.

## Key Conventions

- **Sandboxed Filesystem Access:** All file operations in the backend are strictly sandboxed to the active project root. Traversal attempts (e.g., using `..`) or absolute paths are intentionally rejected.
- **Atomic Project Saves:** Writes to `forge-project.json` must be atomic (write to `.tmp` -> `fsync` -> rename) to prevent corruption during crashes.
- **Security & Secrets:** API keys and secrets are securely stored using the OS keychain via the `keyring` crate. The frontend never receives plaintext secrets after they are saved—only a redacted preview (e.g., `...abcd`) and a boolean flag.
- **Rust to TS Types:** Shared domain types are automatically exported from Rust to TypeScript using the `ts-rs` crate (found in `src-tauri/src/schema/`).
- **Error Handling:** Backend errors implement a specific typed hierarchy (`ForgeError`) which is mapped to a secure `WireError` before being returned over IPC.
- **Database Migrations:** SQLite schema migrations are managed via the `refinery` crate and are embedded directly into the Rust binary.
