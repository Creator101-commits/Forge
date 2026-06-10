-- PCB workspace tables: layers, footprints, pads, traces, vias, zones, outline.

CREATE TABLE IF NOT EXISTS pcb_layer (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#888888',
    visible INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pcb_footprint (
    id TEXT PRIMARY KEY NOT NULL,
    component_ref TEXT NOT NULL,
    library_id TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    rotation REAL NOT NULL DEFAULT 0,
    side TEXT NOT NULL DEFAULT 'top'
);

CREATE TABLE IF NOT EXISTS pcb_pad (
    id TEXT PRIMARY KEY NOT NULL,
    footprint_id TEXT NOT NULL REFERENCES pcb_footprint(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    net_id TEXT,
    shape_json TEXT NOT NULL DEFAULT '{}',
    layer_mask INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pcb_trace (
    id TEXT PRIMARY KEY NOT NULL,
    net_id TEXT NOT NULL,
    layer_id TEXT NOT NULL,
    points_json TEXT NOT NULL DEFAULT '[]',
    width REAL NOT NULL DEFAULT 0.2
);

CREATE TABLE IF NOT EXISTS pcb_via (
    id TEXT PRIMARY KEY NOT NULL,
    net_id TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    drill REAL NOT NULL DEFAULT 0.3,
    diameter REAL NOT NULL DEFAULT 0.6
);

CREATE TABLE IF NOT EXISTS pcb_zone (
    id TEXT PRIMARY KEY NOT NULL,
    net_id TEXT NOT NULL,
    layer_id TEXT NOT NULL,
    polygon_json TEXT NOT NULL DEFAULT '[]',
    clearance REAL NOT NULL DEFAULT 0.25
);

CREATE TABLE IF NOT EXISTS pcb_outline (
    id TEXT PRIMARY KEY NOT NULL,
    polygon_json TEXT NOT NULL DEFAULT '[]'
);
