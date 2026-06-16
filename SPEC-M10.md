# Spec: M10 — Demo Project + Onboarding Experience

## Objective
Build the first-launch polish experience for Forge: a temperature monitor demo project, onboarding tour, crash recovery UI, and workspace polish.

## Commands
```
Build: pnpm build
Typecheck: pnpm typecheck
Test: pnpm test
Lint: pnpm lint
```

## Project Structure — New/Modified Files
```
assets/demo-project/          ← NEW: richer demo project (Temperature Monitor v1)
  project.json
  firmware/temperature-monitor.ino
  schematic.json
  pcb.json
  cad.json

src/features/
  onboarding/                 ← NEW: onboarding tour
    OnboardingTour.tsx
    OnboardingTour.test.tsx
  dashboard/
    Dashboard.tsx              ← MODIFIED: enable demo button, add crash recovery
    CrashRecovery.tsx          ← NEW: crash recovery modal
    CrashRecovery.test.tsx     ← NEW
src/app/
  AppShell.tsx                 ← MODIFIED: add onboarding tour
  App.tsx                      ← MODIFIED: add crash recovery check
src/store/
  onboarding.ts               ← NEW: onboarding tour state (visible, completed)
  eventLog.ts                 ← NEW: event log state for crash detection
```

## Code Style
- Prefer composition, use `clsx`, Lucide icons, design tokens from `tokens.css`
- Use `@radix-ui/react-dialog` for modals
- `onboarding` store: Zustand with localStorage persistence

## Testing Strategy
- Vitest + jsdom + @testing-library/react
- Test tour renders, step progression, dismiss, keyboard nav
- Test crash recovery modal shows/hides based on event log state
- Test demo project assets can be loaded by the IPC mock

## Boundaries
- Always: typecheck, follow design tokens, test
- Ask first: schema changes for demo assets
- Never: hardcode Rust-only features on frontend
