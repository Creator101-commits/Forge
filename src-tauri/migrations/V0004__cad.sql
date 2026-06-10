-- CAD workspace tables: objects (scene graph) and named views.

CREATE TABLE IF NOT EXISTS cad_object (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'box',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    z REAL NOT NULL DEFAULT 0,
    rx REAL NOT NULL DEFAULT 0,
    ry REAL NOT NULL DEFAULT 0,
    rz REAL NOT NULL DEFAULT 0,
    sx REAL NOT NULL DEFAULT 1,
    sy REAL NOT NULL DEFAULT 1,
    sz REAL NOT NULL DEFAULT 1,
    color TEXT NOT NULL DEFAULT '#888888',
    locked INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cad_view (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    camera_json TEXT NOT NULL DEFAULT '{}'
);
