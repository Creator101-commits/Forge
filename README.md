![Banner](./image.png)

# Forge

> AI-native hardware engineering IDE -- CAD, circuit, PCB, code, BOM, AI, serial, and export in one desktop application.

![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Creator101-commits/Forge?include_prereleases)
![GitHub last commit](https://img.shields.io/github/last-commit/Creator101-commits/Forge)
![GitHub issues](https://img.shields.io/github/issues-raw/Creator101-commits/Forge)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Creator101-commits/Forge)
![GitHub](https://img.shields.io/github/license/Creator101-commits/Forge)

Forge is a cross-platform desktop application that brings together schematic capture, PCB layout, CAD, a code editor, serial monitor, AI assistance, BOM management, and firmware compilation/upload into a single workspace. Built on Tauri 2 with a Rust backend and a React/TypeScript frontend, it runs on Linux, macOS, and Windows.

## Table of Contents

- [Forge](#forge)
- [Quickstart / Demo](#quickstart--demo)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [Release History](#release-history)
- [License](#license)
- [Meta](#meta)

## Quickstart / Demo
[(Back to top)](#table-of-contents)

A short demo, screenshot, or GIF that lets the reader see the project in action in under a minute. Link to a hosted demo if you have one.

## Installation
[(Back to top)](#table-of-contents)

Prerequisites: Node 22+, pnpm 9 (managed via corepack), Rust stable.

**macOS & Linux**

```sh
git clone https://github.com/Creator101-commits/Forge.git
cd Forge
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm tauri:dev
```

**Windows**

```sh
git clone https://github.com/Creator101-commits/Forge.git
cd Forge
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm tauri:dev
```

## Usage
[(Back to top)](#table-of-contents)

Forge provides multiple workspaces accessible from the activity rail. The primary workflows are:

- **Code** -- Monaco editor with file tree, project-wide search, problems panel, and serial monitor.
- **Schematic** -- Capture circuits with ERC validation.
- **Circuit** -- Breadboard, block, and ladder diagram modes.
- **PCB** -- Board layout with DRC and Gerber export.
- **CAD** -- 3D mechanical design.
- **BOM** -- Bill of materials generation and export.
- **AI** -- Pluggable provider interface with approval-gated code patching and persona switching.

```sh
pnpm tauri:dev      # launch in development mode
pnpm tauri:build    # produce installers for the current OS
```

## Development
[(Back to top)](#table-of-contents)

Instructions for setting up a local development environment.

```sh
git clone https://github.com/Creator101-commits/Forge.git
cd Forge
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm tauri:dev
```

**Running checks:**

```sh
pnpm lint                   # eslint
pnpm typecheck              # tsc --noEmit
pnpm test                   # vitest
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --lib
```

## Contributing
[(Back to top)](#table-of-contents)

Contributions are welcome. To propose a change:

1. Fork it (https://github.com/Creator101-commits/Forge/fork)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Open a new Pull Request

Please make sure tests pass and the code is formatted before opening a PR.

## Release History
[(Back to top)](#table-of-contents)

* 0.12.0-rc
    * CHANGE: M11 -- QA, security, fuzz, migrations
* 0.11.0
    * ADD: M10 -- Demo, onboarding, perf, accessibility
* 0.10.0
    * ADD: M9 -- Compile + upload toolchain
* 0.9.0
    * ADD: M8 -- BOM + full export pipeline
* 0.8.0
    * ADD: M7 -- CAD workspace
* 0.7.0
    * ADD: M6 -- PCB workspace + DRC + Gerber
* 0.6.0
    * ADD: M5 -- Circuit: breadboard, block, ladder modes
* 0.5.0
    * ADD: M4 -- Schematic editor + ERC
* 0.4.0
    * ADD: M3 -- Pluggable AI providers + approval-gated code patching
* 0.3.0
    * ADD: M2 -- Monaco code workspace + serial
* 0.2.0
    * ADD: M1 -- Project persistence + activity rail + command palette + settings v1
* 0.1.0
    * ADD: M0 -- Foundations and scaffold

## License
[(Back to top)](#table-of-contents)

Distributed under the MIT License.

## Meta
[(Back to top)](#table-of-contents)

Project link: [https://github.com/Creator101-commits/Forge](https://github.com/Creator101-commits/Forge)
