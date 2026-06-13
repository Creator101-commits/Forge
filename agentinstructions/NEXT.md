# Forge — Where We Are & Plan to Finish

> Companion to [`plan.md`](./plan.md) (the canonical M0→M12 spec). This file records the **actual** state of the codebase as of 2026-06-13 and the ordered plan to complete the rest. Where `plan.md` describes the target, this file describes the gap.

## Snapshot

The repo mirrors `Creator101-commits/forge` `main` (commit `fa39079`). The README still says "M2 (v0.3.0)", but the code is further along in breadth and shallower in depth than that label implies: **M0–M3 are substantially built; M4–M9 have Rust backends but mostly placeholder frontends; M10–M12 are not started.**

### Local constraint (important)
There is **no Rust toolchain on this machine**, so `src-tauri` cannot be compiled or `cargo test`ed here. The **frontend (`src/`) is the locally verifiable deliverable** (`pnpm test`, `pnpm typecheck`, `pnpm build`, Vite dev server). Backend-only work (export formats, Gerber, compile/upload) must be authored carefully and verified in CI, not locally.

## Milestone status (actual)

| M | Area | Backend | Frontend | Verdict |
|---|------|---------|----------|---------|
| M0 | Foundations, CI, tokens, ts-rs, keyring | ✅ | ✅ | **Done** |
| M1 | Project persistence, router, palette, settings, autosave | ✅ `project_store` 333L, V0001 | ✅ | **Done** |
| M2 | Code: Monaco, file tree, search, problems, serial, boards | ✅ `serial` 281L, `search` 192L | ✅ EditorPane uses Monaco | **Done** |
| M3 | Pluggable AI (4 providers), action router, dock | ✅ `ai` 1668L, `commands/ai.rs` 672L | ✅ AiDock 274L | **Mostly done** — verify approval-gated apply/revert + key isolation |
| M4 | Schematic editor + ERC | ⚠️ `circuit_ops` 226L (ERC present), V0002 | ❌ `CircuitWorkspace` is all empty-state placeholders | **Backend only** |
| M5 | Breadboard / block / ladder modes | ⚠️ schema mode field | ❌ placeholder canvases | **Backend only** |
| M6 | PCB + DRC + Gerber | ⚠️ `pcb_ops` 218L (DRC present), V0003 | ⚠️ `PcbWorkspace` 135L, no real WebGL board confirmed | **Partial; no Gerber dep** |
| M7 | CAD 3D workspace | ⚠️ `cad_ops` 126L, V0004 | ❌ **no three.js/r3f installed** | **Backend only; 3D missing** |
| M8 | BOM + export pipeline | ⚠️ `bom_ops` 99L; `export` 35L = **stub** | ⚠️ `BomWorkspace` 112L | **Export is placeholder** (CSV partial, SVG is literal placeholder text; no XLSX/PDF/Gerber/bundle) |
| M9 | Compile + upload toolchain | ⚠️ `compile` 207L (detects arduino-cli/pio/rustup) | ⚠️ `CompileWorkspace` 198L w/ placeholders | **Partial** — error→Monaco markers & upload flow unverified |
| M10 | Demo project, onboarding, perf, a11y | — | — | **Not started** (only `demo/blink` sample; no onboarding/tour; no crash-restore UI) |
| M11 | QA, security, fuzz, migrations, coverage gates | — | — | **Not started** |
| M12 | Release: installers, signing, auto-update, docs | — | — | **Not started** (only `ci.yml`; no `release.yml`) |

Tests today: **21 FE test files**, **103 Rust `#[test]`/`#[tokio::test]`**.

Missing deps that block plan items: `rust_xlsxwriter`, `printpdf`, a Gerber writer, `tantivy` (search is regex-walk for now), and frontend `three`/`@react-three/fiber`/`@react-three/drei` for CAD.

---

## Plan to complete the rest

Ordered to (a) front-load the locally **verifiable** frontend work that already has backend support, and (b) batch the **CI-only** Rust work that can't be built here. Each task closes only with its test, per `plan.md` §E.

### Phase 1 — Finish M3 and harden the foundation (verify, don't rebuild)
1. **Verify M3 end-to-end in the dock:** add a provider key → chat → propose a code change → preview diff → approve → revert. Confirm `ai_apply_patch`/`ai_revert_patch` round-trip via `event_log`.
   - Test (FE): RTL test on AiDock asserting action card → preview → approve calls IPC; revert restores prior buffer (mock `invoke`).
2. **Key isolation audit:** assert no plaintext API key appears in any IPC response payload (only redacted preview + `is_set`).
   - Test (Rust, CI): payload-scan unit test over `get_secret_meta`.
3. Refresh `README.md` milestone line to reflect true state (M3 + partial M4–M9).

### Phase 2 — M4 Schematic frontend (highest value; backend + ERC already exist) — ✅ CORE DONE
Status (2026-06-13): implemented `src/features/circuit/symbols.tsx` (12-symbol starter
library), `src/store/circuit.ts` (schematic graph + geometry + client-side ERC mirroring
`circuit_ops::run_erc`), interactive `SchematicCanvas` (pan/zoom, place, select/move, rotate/
mirror, orthogonal wiring with auto-nets), `SymbolPalette`, `ErcPanel` (wired into BottomDock),
and `CircuitInspector` (wired into the right panel). Covered by `circuit.test.ts` (16) +
`CircuitWorkspace.test.tsx` (7). Typecheck/lint/build/test all green; verified live in-browser.
Remaining M4: AI "generate circuit from prompt" action (step 9) + schematic SVG export
(step 12, backend render). Original step list:
4. Ship a starter symbol library JSON (resistor, cap, LED, transistor, regulator, headers, power symbols, Uno/ESP32) under `assets/symbols/`; schema-validate on load.
5. SVG canvas: pan/zoom, snap grid, marquee select.  → Test: drop a component, assert pin coords snap to grid.
6. Symbol palette + drag-place; orthogonal wire tool with auto-junctions.  → Test: connect two pins, assert net coalesces.
7. Ref designators (auto-increment), values, rotate/mirror, net labels, component inspector (bulk edit).  → Test: rotate → pin positions update; multi-select edit applies to all.
8. Wire **ERC panel** in the bottom dock to `run_erc`; click-to-jump selects the offender.  → Test: synthetic ERC issue navigates viewport.
9. "Generate circuit from prompt" AI action → structured actions previewed before apply.  → Test: fixture prompt yields expected add_component/add_wire actions.
   - **Exit:** build the Temperature Monitor schematic with clean ERC → `v0.5.0`.

### Phase 3 — M5 circuit modes (share the M4 data model) — ✅ EDITORS DONE
Status (2026-06-13): all three extra modes implemented and verified live.
- block: `src/store/blocks.ts` + `BlockCanvas.tsx` (categorized blocks, directional labeled
  connections, self/dup guards).
- breadboard: `src/store/breadboard.ts` (tie-point grid + rails as nodes, union-find
  `computeNets` for electrical awareness, jumpers) + `BreadboardCanvas.tsx` (color picker,
  click-two-holes jumpers, net tinting).
- ladder: `src/store/ladder.ts` (rungs of contacts→coils + `evaluateRung` simulation) +
  `LadderCanvas.tsx` (add/relabel/remove elements, input toggles, live energization).
All wired into `CircuitWorkspace` mode switch. Tested: `blocks`/`breadboard`/`ladder` store
tests + `BlockCanvas` component test. Remaining M5: AI per-mode actions + SVG/PDF exports (backend).
10. Breadboard renderer (tie-point grid, rails, colored jumpers, net-aware).
11. Block diagram (draggable categorized blocks, directional/protocol-labeled connections, swimlanes).
12. Ladder diagram (contacts/coils/timers, rungs, symbolic variable table).
13. One AI action per mode (schematic→block convert; breadboard layout suggest; ladder rungs from description). → goldens.  **Exit:** `v0.6.0`.

### Phase 4 — M6 PCB frontend + Gerber backend
14. Canvas/WebGL board view: pan/zoom, snap grid, layer-tinted render; footprint palette + placement with netlist linkage from circuit data.
15. Trace routing (width classes, layer switch via vias), via/zone/keepout/outline tools; ratsnest in Rust, live update.
16. Wire **DRC panel** to `run_drc` (clearance/width/unrouted/overlap).  → fixture violations enumerated.
17. **(CI-only)** add a Gerber/Excellon writer dep + `export_pcb_gerbers`; byte-stable golden test on a small fixture.
18. 3D preview (reuse the `three` stack from Phase 5).  **Exit:** route the demo to a clean 2-layer board with exportable Gerbers → `v0.7.0`.

### Phase 5 — M7 CAD 3D workspace
19. Add `three` + `@react-three/fiber` + `@react-three/drei` to `package.json`.
20. R3F viewport (orbit/pan/zoom, grid + axes, units), primitive library, transform gizmos with snapping, object tree + inspector, named views + screenshot.
21. AI CAD actions (add object by prompt, generate enclosure around selection, describe scene) → goldens.  **Exit:** demo assembly with one AI enclosure pass → `v0.8.0`.

### Phase 6 — M8 BOM + real export pipeline (⚠️ partial — derivation done)
Status (2026-06-13): `src/features/bom/deriveBom.ts` aggregates BOM rows live from the
schematic `circuit` store (group by symbol+value, collect refs, exclude power symbols, price
from a catalog) + `bomToCsv`; `BomWorkspace` renders the live table with filter and client-side
CSV export. Tested in `deriveBom.test.ts` + `BomWorkspace.test.tsx`. Remaining: PCB-footprint
contribution, virtualized table, XLSX/PDF (Rust), bundle ZIP, export wizard.
22. BOM aggregator deriving rows from `circuit_component` + `pcb_footprint`; virtualized table (`@tanstack/react-virtual`) with inline edit/sort/filter/group/dedupe; sourcing widget v1 (mock supplier).
23. **(CI-only)** replace the `export` stub: real CSV, **XLSX** (`rust_xlsxwriter`), **PDF** (`printpdf`), real schematic/block/ladder/PCB image renders, and a **project bundle ZIP**; structural assertions per artifact.
24. Export wizard UI (validation, progress, warnings, deterministic filenames, cancel cleans temp).  **Exit:** one-click "Export Everything" → `v0.9.0`.

### Phase 7 — M9 compile + upload
25. Finish `detect_toolchains` capability matrix UI (missing-toolchain install guidance per OS).
26. Compile invocation streaming `compile://log`; per-toolchain error parser → unified diagnostics → **Monaco markers**; upload state machine (build→reset→flash→verify).
27. "Fix this error" AI action targeted at a diagnostic range.  **Exit:** compile+upload demo firmware; inline markers; AI fix works → `v0.10.0`.

### Phase 8 — M10 → M12 (release readiness)
28. **M10:** bundle the "Temperature Monitor v1" demo (`assets/demo-project/`) loaded by "Open Demo"; onboarding tour (a11y + reduced-motion); crash-restore from `event_log` tail; perf + accessibility passes with budgets in CI.  → `v0.11.0`.
29. **M11:** coverage gates (FE ≥80% on `lib/`+`store/`; Rust ≥80% on `project_store`/`*_ops`/`diagnostics`/`export`/`ai::action_router`); Playwright E2E over canonical flows; migration tests across versions; `cargo audit`/`pnpm audit`; fuzz critical parsers.  → `v0.12.0-rc`.
30. **M12:** `release.yml` (build+sign+publish on tag), per-OS bundles (`.dmg/.msi/.deb/.AppImage`), macOS notarization + Windows signing, Tauri auto-update channels, user docs.  → `v1.0.0`.

---

## Recommended immediate next step
Start **Phase 2 (M4 schematic frontend)** — it's the highest-value, locally verifiable work, and the Rust ERC/circuit_ops backend is already there to wire against. Phase 1 verification can run alongside it.
