-- Circuit workspace tables: components, pins, wires, nets, annotations, board layouts.

CREATE TABLE IF NOT EXISTS circuit_component (
    id TEXT PRIMARY KEY NOT NULL,
    ref_des TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    symbol_id TEXT NOT NULL,
    footprint_id TEXT,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    rotation REAL NOT NULL DEFAULT 0,
    mirrored INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'schematic'
);

CREATE TABLE IF NOT EXISTS circuit_pin (
    id TEXT PRIMARY KEY NOT NULL,
    component_id TEXT NOT NULL REFERENCES circuit_component(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number TEXT NOT NULL,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    electrical_type TEXT NOT NULL DEFAULT 'passive'
);

CREATE TABLE IF NOT EXISTS circuit_wire (
    id TEXT PRIMARY KEY NOT NULL,
    net_id TEXT NOT NULL,
    points_json TEXT NOT NULL DEFAULT '[]',
    mode TEXT NOT NULL DEFAULT 'schematic'
);

CREATE TABLE IF NOT EXISTS circuit_net (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    class TEXT NOT NULL DEFAULT 'signal'
);

CREATE TABLE IF NOT EXISTS circuit_annotation (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text',
    text TEXT NOT NULL DEFAULT '',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0
);

-- Layout tables for per-mode storage
CREATE TABLE IF NOT EXISTS circuit_layout_breadboard (
    id TEXT PRIMARY KEY NOT NULL,
    component_id TEXT NOT NULL REFERENCES circuit_component(id) ON DELETE CASCADE,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    side TEXT NOT NULL DEFAULT 'top'
);

CREATE TABLE IF NOT EXISTS circuit_layout_block (
    id TEXT PRIMARY KEY NOT NULL,
    component_id TEXT NOT NULL REFERENCES circuit_component(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'generic',
    swimlane INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS circuit_layout_ladder (
    id TEXT PRIMARY KEY NOT NULL,
    component_id TEXT NOT NULL REFERENCES circuit_component(id) ON DELETE CASCADE,
    rung INTEGER NOT NULL DEFAULT 0,
    position TEXT NOT NULL DEFAULT 'contact'
);
