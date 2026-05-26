Build a production-grade desktop application called "Forge" using **Tauri 2 + Rust** as the core architecture.

The product is an **AI-native hardware engineering IDE** that lets a user go from concept to shipped hardware inside one application. It must combine:
1. 3D CAD viewing and lightweight 3D modeling,
2. circuit design in multiple modes,
3. PCB layout,
4. embedded code editing,
5. BOM generation,
6. AI assistance with full read/write access across all modules,
7. export/build/share workflows.

This is not a toy app, not a landing page, and not a browser-only prototype. Build it as a **real desktop application** with a fast Rust backend and a high-quality frontend UI rendered inside Tauri.

==================================================
1. CORE PLATFORM DECISIONS
==================================================

Use this stack:

- Desktop shell: **Tauri 2**
- Backend: **Rust**
- Frontend: **TypeScript + React**
- Build tool: **Vite**
- State management: **Zustand** or **Redux Toolkit**
- Desktop-to-backend bridge: **Tauri commands / invoke**
- 3D rendering: **Three.js**
- Code editor: **Monaco Editor**
- Diagram rendering:
  - SVG for schematic, block, and ladder views
  - Canvas/WebGL for PCB layout interactions
- Data validation: **Zod**
- Styling: **Tailwind CSS** or a custom token system with CSS variables
- Icons: **Lucide**
- Command palette: **Fuse.js**
- Markdown render for AI: **Marked** or **react-markdown**
- Local database:
  - use **SQLite** via Rust for project persistence
  - optionally use **sqlx** or **rusqlite**
- Async runtime: **Tokio**
- Serialization: **Serde**
- File packaging/export: Rust + JS zip support where needed
- Logging:
  - frontend logs for UI
  - Rust logging with tracing / tracing-subscriber

The architecture must be **desktop-first**, not browser-first. The frontend is only the interface layer. All sensitive, heavy, or OS-native work must happen in Rust.

==================================================
2. PRODUCT VISION
==================================================

The application is an all-in-one hardware project workspace for students, makers, robotics builders, embedded developers, and electrical engineers.

The app should let a user:
- design a device enclosure or hardware assembly in 3D,
- create a schematic,
- create a breadboard/wiring diagram,
- create a block diagram,
- create a PLC ladder diagram,
- design a PCB,
- write firmware code,
- simulate selected workflows,
- generate and optimize a bill of materials,
- ask AI to modify any part of the project,
- export manufacturing and development artifacts.

The defining feature is that AI is not just a chatbot. AI is a **native project operator** with structured access to:
- project metadata,
- CAD scene graph,
- circuit graph,
- PCB nets and footprints,
- code files,
- BOM data,
- settings,
- diagnostics,
- compile results,
- export targets.

==================================================
3. PERFORMANCE GOALS
==================================================

Optimize for speed, responsiveness, and low memory use.

Hard requirements:
- cold launch should feel near-instant,
- UI interactions should remain smooth at 60fps in common workflows,
- opening a project should not block the main thread,
- all file I/O must happen off the UI thread,
- large AI responses must stream incrementally,
- CAD scene operations must remain smooth with dozens of objects,
- PCB pan/zoom must remain smooth on large boards,
- code editor must handle multi-file embedded projects cleanly,
- command palette must open in under 100ms after hotkey.

Architectural rules:
- Rust handles native operations, parsing, file access, serial access, AI API calls, project indexing, and export generation.
- React/TypeScript handles layout, view state, interaction state, and rendering orchestration.
- Heavy transforms, DRC, ERC, BOM normalization, netlist parsing, project saving, and serial communication must be done in Rust.
- Use workers or async chunking on the frontend for anything potentially expensive in rendering.

==================================================
4. CROSS-PLATFORM TARGETS
==================================================

Target:
- Windows 10/11
- macOS (Intel and Apple Silicon)
- Linux desktop

Design the application so the same codebase works on all three.

Respect platform conventions:
- native window controls,
- proper menu integration,
- correct file path handling,
- correct serial port naming,
- native installer output,
- correct keyboard shortcut labels (Cmd on macOS, Ctrl on Windows/Linux).

Use platform-safe abstractions for:
- file dialogs,
- open/save workflows,
- serial devices,
- app data directories,
- menu bar,
- notifications,
- drag-and-drop.

==================================================
5. HIGH-LEVEL APP LAYOUT
==================================================

Build a professional engineering-tool layout.

Main shell:
- Top titlebar / command region
- Left activity rail
- Optional left secondary sidebar
- Main center workspace
- Right inspector/properties panel
- Bottom AI/chat/console region
- Bottom status bar

Visual feel:
- dark, dense, precise, technical,
- inspired by VS Code, KiCad, Fusion 360, Figma inspector panels,
- minimal decoration,
- no generic startup-landing-page aesthetics,
- no purple gradient blobs,
- no giant rounded cartoon cards,
- no glassmorphism overuse,
- focus on clarity, contrast, and information density.

Layout details:
- activity rail: narrow icon strip
- secondary sidebar: contextual navigation, layers, files, components, footprints, diagnostics
- main panel: tabbed workspace for CAD, circuit, PCB, code, BOM, exports
- right panel: context-sensitive inspector
- bottom region: AI panel, logs, terminal, compile output, DRC/ERC panel
- exactly controlled scroll regions; avoid nested scroll chaos

==================================================
6. DESIGN SYSTEM
==================================================

Use a real design system, not random colors.

Theme:
- dark mode default
- optional light mode
- neutral charcoal surfaces
- teal as the main active accent
- orange for warnings
- red for destructive/error
- green for valid/success
- muted grays for secondary state

Typography:
- body font: Satoshi / Inter / equivalent clean sans
- display font: Cabinet Grotesk or similar restrained display sans
- mono font: JetBrains Mono / Fira Code
- dense but readable sizes
- body text must remain legible at normal density
- avoid oversized marketing typography

Design tokens:
- define CSS variables for:
  - background levels,
  - surface levels,
  - divider/border,
  - text primary/muted/faint/inverse,
  - accent colors,
  - radius scale,
  - spacing scale,
  - shadow scale,
  - animation durations,
  - z-index layers

Interaction rules:
- all panels must have clear focus state,
- keyboard navigation must work,
- selected objects/components/footprints must have consistent highlight patterns,
- hover states only on interactive elements,
- every destructive action requires confirmation or undo.

==================================================
7. ROUTING AND APP SHELL
==================================================

Use a desktop-style single-shell application, not multi-page navigation.

Primary workspaces:
- Dashboard
- CAD
- Circuit
- PCB
- Code
- BOM
- AI
- Export
- Settings

Navigation model:
- activity rail changes workspace
- each workspace can have internal tabs/submodes
- preserve state when switching workspaces
- reopening a workspace should restore selection, zoom, and UI mode where reasonable

Use dockable/tabbed panels where practical:
- multiple code files as tabs
- multiple diagrams as tabs
- inspectors can collapse
- terminal/AI/output can share a bottom-tab strip

==================================================
8. PROJECT DATA MODEL
==================================================

Design a clean internal project schema.

Project entity should include:
- id
- name
- description
- created_at
- updated_at
- board_target
- units
- tags
- ai_persona
- project_settings

CAD model:
- scene objects
- transforms
- materials
- hierarchy/groups
- metadata
- constraints
- named views

Circuit model:
- components
- pins
- nets
- wires
- labels
- annotations
- diagram mode metadata
- ERC issues

PCB model:
- board outline
- layers
- footprints
- pads
- vias
- traces
- zones
- net assignments
- design rules
- DRC issues

Code model:
- file tree
- open tabs
- selected file
- board profile
- compile settings
- last build result
- diagnostics

BOM model:
- line items
- supplier options
- substitutions
- stock status
- pricing snapshots
- notes

AI model:
- conversation history
- actions taken
- proposed diffs
- approval state
- context summaries

Persist project data in SQLite and/or project JSON files with a clear migration strategy.

==================================================
9. RUST BACKEND RESPONSIBILITIES
==================================================

Implement Rust as the authoritative backend.

Rust modules should include:
- app_state
- project_store
- filesystem
- ai
- serial
- compile
- export
- cad_ops
- circuit_ops
- pcb_ops
- bom_ops
- search/indexing
- settings
- diagnostics

Rust should expose Tauri commands such as:
- create_project
- open_project
- save_project
- save_project_as
- list_recent_projects
- read_file
- write_file
- rename_path
- delete_path
- list_serial_ports
- connect_serial
- disconnect_serial
- send_serial_data
- compile_firmware
- upload_firmware
- generate_bom
- run_erc
- run_drc
- auto_route
- export_project_bundle
- export_bom_csv
- export_schematic_svg
- export_pcb_gerbers
- ai_chat
- ai_apply_patch
- ai_generate_code
- ai_generate_schematic
- ai_generate_block_diagram
- ai_generate_scene
- get_project_context

Use structured error types and return typed responses to the frontend.

==================================================
10. FRONTEND RESPONSIBILITIES
==================================================

The frontend should be responsible for:
- rendering UI,
- handling interaction state,
- drawing canvases/SVG views,
- calling Rust commands,
- managing transient client state,
- optimistic updates when safe,
- diff previews,
- live property panels,
- keyboard shortcuts,
- drag/drop interactions.

Do not place critical business logic only in the frontend.

Frontend folder structure example:
- src/app
- src/components
- src/features/cad
- src/features/circuit
- src/features/pcb
- src/features/code
- src/features/bom
- src/features/ai
- src/features/export
- src/features/settings
- src/lib
- src/hooks
- src/store
- src/types
- src/styles

==================================================
11. CAD MODULE
==================================================

Build a lightweight but serious 3D assembly workspace.

Core functionality:
- Three.js viewport
- orbit / pan / zoom
- selection
- transform gizmos
- object tree
- object naming
- visibility toggle
- lock toggle
- duplicate
- delete
- group / ungroup
- scene hierarchy
- undo / redo

Primitive library:
- box
- cylinder
- sphere
- cone
- torus
- plane
- rounded box
- simple extrusion profiles

Hardware library starter assets:
- Arduino Uno rough model
- Nano rough model
- breadboard rough model
- servo
- DC motor
- stepper motor
- ultrasonic sensor
- IR sensor
- LED
- resistor pack
- battery pack
- standoff
- enclosure shell
- screw placeholder
- connector placeholder

Scene features:
- grid helper
- axis helper
- snapping
- configurable units
- bounding boxes
- measurements
- collision overlap warnings
- named saved views
- screenshot export

Inspector controls:
- position xyz
- rotation xyz
- scale xyz
- dimensions where applicable
- material color
- transparency
- notes
- tags
- lock/freeze

AI CAD actions:
- add object by prompt
- place object by coordinates
- rename objects
- generate a simple enclosure around selected components
- suggest internal spacing
- detect obvious collisions
- describe scene contents

==================================================
12. CIRCUIT MODULE
==================================================

Support multiple diagram modes under one unified data model where possible.

Modes:
1. schematic
2. breadboard / wiring pictorial
3. block diagram
4. ladder diagram
5. logic/state signal view if useful

Schematic editor requirements:
- proper symbol palette
- pin-aware placement
- wire routing
- orthogonal wire segments
- snapping
- net labels
- reference designators
- component values
- rotation / mirror
- annotation text
- ERC validation
- pin hover highlighting
- connection previews
- zoom/pan
- marquee selection

Symbol library starter set:
- resistor
- capacitor
- inductor
- diode
- zener
- LED
- NPN / PNP transistor
- MOSFET N/P
- op-amp
- regulator
- switch
- button
- relay
- buzzer
- motor
- battery
- connector headers
- GND / VCC / +3V3 / +5V / VIN
- Arduino family symbols
- ESP32 family symbol
- Raspberry Pi Pico symbol
- common sensors and modules

Breadboard mode requirements:
- realistic breadboard grid
- drag/drop components
- colored jump wires
- tie-point snapping
- row/column electrical awareness
- rail awareness
- component footprints approximated visually
- suggestions for physical placement

Block diagram mode requirements:
- draggable blocks
- color-coded categories
- directional connections
- port labels
- protocol labels
- swimlanes / layers
- export as SVG/PNG

Ladder mode requirements:
- contacts
- coils
- timers
- counters
- function blocks
- rung controls
- energized-state visualization
- symbolic variable table

AI circuit actions:
- generate circuit from natural language
- analyze existing circuit
- explain how it works
- propose fixes
- recommend resistor or capacitor values
- convert schematic to block diagram
- derive BOM from components
- flag missing pull-ups, missing decoupling, floating pins, unsafe loads

==================================================
13. PCB MODULE
==================================================

Build a dedicated PCB workspace, not just a static image viewer.

Core capabilities:
- board canvas
- zoom/pan
- layer switching
- footprint placement
- trace routing
- via placement
- zone placement
- board outline editing
- keepout regions
- net highlighting
- ratsnest display
- DRC
- layer visibility toggles
- snap grid
- measurement tool
- selection/filtering by layer/net/object type

Starter footprints:
- DIP packages
- QFP packages
- SOIC
- SOT-23
- 0402 / 0603 / 0805
- headers
- USB connectors
- terminal blocks
- Arduino shield footprint
- ESP32 dev board style footprint
- generic mounting holes

Board data:
- netlist-linked pads
- copper layers
- silkscreen
- solder mask
- edge cuts
- drills
- metadata

Export:
- Gerber-like outputs
- drill files
- BOM
- pick-and-place data
- image export

3D preview:
- simple board extrude
- component blocks on board
- board color choices
- rotate/orbit preview

AI PCB actions:
- propose component placement
- flag crowded regions
- suggest trace width classes
- auto-route simple nets
- detect high-current issues heuristically
- suggest decoupling capacitor placement near IC power pins

==================================================
14. CODE MODULE
==================================================

The code editor must feel close to a real embedded IDE.

Use Monaco Editor with:
- syntax highlighting
- IntelliSense where feasible
- line numbers
- minimap
- folding
- find/replace
- tabs
- multi-file project navigation
- theme switching
- diff view
- problem markers

Supported code/project types:
- Arduino C++
- generic C/C++
- MicroPython
- CircuitPython
- Rust embedded
- JSON/YAML config
- shell snippets for tooling

Project tree:
- src
- include
- lib
- assets
- config
- docs
- generated

Code workflows:
- open file
- new file/folder
- rename/delete
- save
- save all
- search in files
- symbol navigation
- diagnostics panel
- compile output panel
- simulated or real serial monitor

Backend integration:
- compile with platform-specific toolchains when configured
- parse compile errors in Rust
- map errors back into Monaco markers
- upload firmware via Rust serial integration when configured
- support board profiles and environment presets

AI code actions:
- generate full sketch from circuit
- write a function from a comment
- explain selected code
- fix bug in selected region
- optimize memory or speed
- convert Arduino code to MicroPython
- add comments/docstrings
- create drivers from pin mapping
- generate tests or simulation stubs

==================================================
15. BOM MODULE
==================================================

Create a BOM workspace that is actually useful.

Features:
- table/grid view
- columns for reference, value, package, description, quantity, unit price, total price, supplier, stock, notes, substitute
- sort and filter
- inline editing
- totals
- warnings
- export CSV/XLSX/PDF
- sourcing suggestions
- substitute suggestions
- grouping identical parts
- deduplication
- missing metadata warnings

AI BOM actions:
- optimize BOM cost
- suggest easier-to-source alternates
- identify unnecessary diversity of passives
- standardize resistor/capacitor values
- flag obsolete parts
- suggest JLC/LCSC-friendly choices when targeting assembly

==================================================
16. AI SYSTEM
==================================================

Design AI as a structured action engine, not a dumb chat box.

Core AI architecture:
- frontend chat panel
- Rust AI service layer
- prompt builder
- tool/action router
- context summarizer
- diff/proposal engine
- approval flow for destructive changes
- streaming response support

AI context should include:
- current workspace
- selected objects/components/files
- project summary
- current board target
- current schematic/netlist summary
- current open code file
- recent compile errors
- recent AI actions
- BOM summary
- DRC/ERC issues

AI should support two classes of behavior:
1. conversational explanation
2. structured modification actions

Structured AI actions:
- create/update/delete CAD objects
- create/update/delete circuit components and wires
- generate code files
- patch selected code
- generate BOM notes
- run review across the whole project
- propose exports
- create a project from a natural-language description

AI UI:
- bottom dock panel
- expandable
- markdown support
- syntax-highlighted code blocks
- table rendering
- copy button
- apply-to-project button
- insert-into-editor button
- preview-diff button
- approve / reject changes

AI personas:
- Mentor
- Engineer
- Student Helper

AI safety/approval:
- destructive actions require confirmation
- file overwrite actions show diff
- CAD/circuit large edits show preview
- every applied AI change logs an event in project history

==================================================
17. SERIAL AND DEVICE INTEGRATION
==================================================

Use Rust for serial/device support.

Features:
- enumerate ports
- connect/disconnect
- baud rate selection
- send text/bytes
- receive text/bytes
- serial monitor log
- auto-scroll
- timestamping
- disconnect error handling
- reconnect workflow

Board profiles:
- Arduino Uno
- Nano
- Mega
- ESP32
- ESP8266
- Pico
- STM32 generic

Make the UI show:
- selected board
- selected port
- connection status
- upload status
- last communication timestamp

==================================================
18. FILE SYSTEM AND PROJECT MANAGEMENT
==================================================

Implement real desktop project management.

Features:
- new project
- open project
- recent projects
- autosave
- save as
- import assets
- export bundle
- restore last session when enabled
- project templates
- file associations if practical

Use a clear on-disk project structure such as:
- forge-project.json
- /cad
- /circuit
- /pcb
- /src
- /exports
- /assets
- /docs
- /generated

Use Rust for:
- reading/writing files
- migration/versioning
- backup snapshots
- recovery after crash

==================================================
19. EXPORT SYSTEM
==================================================

Build a serious export pipeline.

Export targets:
- project bundle
- source code
- BOM CSV/XLSX/PDF
- schematic SVG/PNG
- block diagram SVG/PNG
- ladder diagram PDF/PNG
- PCB fabrication package
- board image renders
- CAD screenshots
- project report
- AI design review report

Export requirements:
- validate before export
- show progress
- surface warnings
- preserve deterministic filenames
- allow export destination selection
- generate clean folder structures

==================================================
20. COMMAND PALETTE
==================================================

Implement a global command palette.

Open with:
- Ctrl+K on Windows/Linux
- Cmd+K on macOS

Should support:
- navigation commands
- project commands
- AI actions
- export commands
- view toggles
- compile/upload commands
- open recent files
- open recent projects
- settings
- theme switching

==================================================
21. KEYBOARD SHORTCUTS
==================================================

Implement deep keyboard support.

Examples:
- Cmd/Ctrl+K command palette
- Cmd/Ctrl+S save
- Cmd/Ctrl+Shift+S save as
- Cmd/Ctrl+P quick open file
- Cmd/Ctrl+B toggle sidebar
- Cmd/Ctrl+/ toggle AI panel
- Cmd/Ctrl+Z undo
- Cmd/Ctrl+Shift+Z redo
- Delete remove selection
- Esc cancel current tool
- F5 compile/upload
- space or hotkeys for view tools in CAD/PCB
- custom shortcuts for AI explain/fix/generate in code

==================================================
22. SETTINGS
==================================================

Settings categories:
- General
- Appearance
- Editor
- CAD
- Circuit
- PCB
- AI
- Device
- Export
- Shortcuts
- Advanced

Examples:
- theme
- font sizes
- grid size
- unit system
- autosave interval
- default board target
- AI persona
- AI response style
- default export location
- serial defaults
- DRC rule presets
- accessibility settings
- reduced motion
- telemetry off by default unless intentionally added

==================================================
23. STARTER DEMO PROJECT
==================================================

Ship with a demo project preloaded.

Demo project:
- "Temperature Monitor v1"

Include:
- a small 3D assembly with board + sensor + enclosure,
- a simple schematic using a temperature sensor and microcontroller,
- a block diagram,
- a tiny PCB example,
- a working firmware example,
- a BOM,
- AI suggestions already present as examples.

This demo should make the app feel complete immediately on first launch.

==================================================
24. ERROR HANDLING
==================================================

Handle errors like a serious desktop tool.

Need:
- typed Rust errors
- user-friendly frontend messages
- expandable technical details
- non-blocking notifications
- blocking dialogs only when necessary
- recovery paths
- undo where possible
- crash-resistant autosave/recovery

Examples:
- failed serial connection
- compile tool missing
- export path invalid
- SQLite migration issue
- malformed project file
- AI request failed
- unsupported asset import

==================================================
25. ACCESSIBILITY
==================================================

Do not ignore accessibility.

Requirements:
- keyboard navigable UI
- visible focus states
- semantic labeling
- sufficient contrast
- reduced motion mode
- screen-reader-friendly labeling for key controls
- avoid relying on color alone for status
- large enough click/tap targets

==================================================
26. TESTING
==================================================

Add a testing strategy.

Frontend:
- unit tests for critical UI logic
- component tests for editor panels and inspectors
- end-to-end tests for common project workflows

Rust:
- unit tests for project parsing, exports, serial abstractions, AI action parsing, DRC/ERC logic where feasible
- integration tests for command responses
- migration tests for persisted project data

Test flows:
- create/open/save project
- switch workspaces
- generate code from AI
- apply AI patch
- compile and parse errors
- export BOM
- connect serial device
- run DRC/ERC
- recover after forced restart

==================================================
27. SECURITY
==================================================

Follow secure desktop practices.

Rules:
- validate all frontend-to-backend inputs
- sanitize file paths
- prevent arbitrary unsafe command execution
- sandbox AI-applied file mutations through explicit approval
- log sensitive operations
- never expose secrets in frontend state
- isolate API keys to Rust backend if external AI is used
- use allowlists for system capabilities

==================================================
28. BUILD, PACKAGING, AND RELEASE
==================================================

Use Tauri-native packaging and a release workflow that can produce installers for Windows, macOS, and Linux.

Use CI with platform-specific runners to build release artifacts.

Release outputs:
- Windows installer
- macOS app bundle / DMG
- Linux package(s)

Include:
- app icon set
- versioning
- changelog support
- signed builds where possible
- update strategy planning

==================================================
29. RUST CRATES TO CONSIDER
==================================================

Consider crates such as:
- tauri
- tokio
- serde
- serde_json
- anyhow / thiserror
- tracing
- tracing-subscriber
- rusqlite or sqlx
- serialport
- zip
- uuid
- chrono
- directories
- walkdir
- regex
- image
- reqwest
- parking_lot
- once_cell

Only use crates that serve a clear purpose.

==================================================
30. FRONTEND LIBRARIES TO CONSIDER
==================================================

Consider:
- react
- typescript
- vite
- zustand or redux toolkit
- monaco-editor
- @react-three/fiber if useful, or raw three.js
- react-markdown or marked
- lucide-react
- fuse.js
- zod
- react-resizable-panels
- react-aria or similar helpers where useful

Keep the bundle disciplined.

==================================================
31. INTERNAL UX STANDARDS
==================================================

The app must feel like a real engineering tool.

Rules:
- no fake marketing sections inside the product UI
- no decorative nonsense replacing clarity
- no giant empty paddings
- no inconsistent radius sizes
- no random neon gradients
- no lag on selection changes
- no placeholder text visible to the user
- no modal spam
- no data loss on workspace switching
- no hidden destructive actions

==================================================
32. OUTPUT REQUIREMENTS
==================================================

Generate a complete project structure and implementation plan.

Output:
1. full folder structure,
2. package/dependency lists,
3. Rust backend module breakdown,
4. frontend component breakdown,
5. state model,
6. database schema,
7. IPC command definitions,
8. UI layout spec,
9. design tokens,
10. detailed implementation of each workspace,
11. AI integration architecture,
12. serial integration architecture,
13. export architecture,
14. testing plan,
15. release plan.

Then generate core starter code for:
- Tauri setup,
- Rust commands,
- React app shell,
- command palette,
- CAD workspace shell,
- circuit workspace shell,
- PCB workspace shell,
- Monaco code workspace,
- AI dock,
- SQLite persistence layer,
- sample project loader.

Do not produce a shallow mockup. Produce a serious engineering-grade starting point.