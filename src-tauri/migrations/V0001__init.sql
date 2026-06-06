-- Forge initial schema (M1).
--
-- This migration is applied to both the per-project database (`forge.db`,
-- which uses `project` + `event_log`) and the user-level database
-- (`forge-user.db`, which uses `recent_project` + `app_settings`).
-- Applying the full set to both is harmless and keeps a single migration
-- history to reason about.

CREATE TABLE IF NOT EXISTS project (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    board_target   TEXT,
    units          TEXT NOT NULL DEFAULT 'mm',
    tags_json      TEXT NOT NULL DEFAULT '[]',
    ai_persona     TEXT NOT NULL DEFAULT 'Engineer',
    settings_json  TEXT,
    schema_version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log (created_at);

CREATE TABLE IF NOT EXISTS recent_project (
    path      TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    opened_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    id            INTEGER PRIMARY KEY CHECK (id = 0),
    settings_json TEXT NOT NULL
);
