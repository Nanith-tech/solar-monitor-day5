# Project guidance for agents

## Scope and project root

This file applies to `solar-monitor/` and its descendants. This file's directory
is the application root; run all npm commands below from here. Read any more
specific `AGENTS.md` before changing files in its scope.

Solar Monitor is a college IoT prototype: an ESP32 with an INA219 measures
load-side voltage and current, sends authenticated HTTP telemetry to Express,
stores readings in MongoDB, and displays live and historical data in React.
The interactive solar panel is an educational model with local experiment
controls. It is not a hardware controller or a calibrated panel-efficiency meter.

## Read before changing behavior

Paths in this section are relative to `solar-monitor/`:

- `README.md`: startup, setup, and verification commands.
- `PRODUCT.md`: product boundaries and measurement semantics.
- `DESIGN.md`: existing visual system, accessibility, and responsive behavior.
- `docs/API.md`: HTTP, Socket.IO, ingestion, history, and Wi-Fi contracts.
- `docs/ENERGY_METHOD.md`: energy integration, coverage, and calendar rules.
- `docs/WIFI_SETUP.md` and `docs/DISCOVERY.md`: provisioning and LAN discovery.
- `docs/WIRING.md`: physical wiring; consult before firmware/hardware changes.
- `docs/PROJECT_STATE.md`, `docs/ACCEPTANCE.md`, and `docs/TROUBLESHOOTING.md`:
  recorded limitations, local acceptance, and diagnostics. Treat historical test
  reports as prior evidence, not proof that the current change passes.

## Code map

All paths below are relative to `solar-monitor/`:

- `client/src/`: React components, pages, hooks, API client, utility functions,
  and the shared CSS in `styles/global.css`.
- `client/tests/`: Node test-runner tests for client utilities.
- `server/src/`: Express routes/controllers, services, Mongoose models,
  validation, middleware, configuration, discovery, and Socket.IO support.
- `server/tests/`: backend unit and database integration tests.
- `firmware/solar_monitor/`: ESP32 Arduino sketch and example configuration.
- `tests/firmware/`: C++ host harness and Arduino/library stubs.
- `scripts/`: setup, diagnostics, combined development startup, simulation,
  smoke checks, JavaScript syntax checks, and firmware/network tests.
- `docs/`: setup guides, contracts, acceptance criteria, and project notes.

## Setup and development

Use Node.js 24 or newer. This is an npm workspace with `client` and `server`;
use the root lockfile and install at the application root.

```powershell
npm ci
npm run dev:all
```

The frontend runs at `http://localhost:5173`. The backend defaults to port 4000.
Vite proxies `/api` and `/socket.io` to the backend. `npm start` starts only the
backend; `npm run client` starts only the frontend. Choose either the combined
startup or separate processes to avoid port collisions.

For first-time configuration, follow `docs/SETUP.md` and `npm run setup`.
Use `.env.example` and `firmware/solar_monitor/config.example.h` as templates.
`npm run wifi:setup` provides the provisioning flow without MongoDB; consult
`docs/WIFI_SETUP.md` before using it with a physical board.

## Implementation conventions

- Follow nearby code: JavaScript ES modules, JSX for React, single-quoted
  strings, semicolons, and two-space indentation. Do not introduce TypeScript
  or a new framework without a task-specific reason.
- Keep HTTP access in `client/src/api/`, reusable state in hooks, and pure
  calculations/formatting in utilities. Keep backend validation, persistence,
  and business rules in their existing layers.
- Preserve the established API error shape and configurable device identity.
- Keep changes focused. Avoid unrelated reformatting and dependencies; update
  `package-lock.json` when intentionally changing dependencies.
- For UI work, follow `DESIGN.md`: bundled Manrope, existing tokens, visible
  units/source labels, native keyboard controls, clear focus, reduced motion,
  and responsive layouts. Preserve loading, empty, error, and stale states.

## Data and hardware invariants

- Keep real `sensor` data and `simulator` data separate in storage, subscriptions,
  history, and UI. Never supply fabricated measurements as an automatic fallback.
  Experiment controls change local educational state only.
- Preserve signed current and power. Units are V, mA, and mW;
  `powerMW = voltageV * currentMA`, subject to the validator's rounding tolerance.
  Do not replace this with INA219 raw power-register output.
- `receivedAt` is server reception time. Preserve boot IDs, sequences, uptime,
  and idempotency based on `(deviceId, bootId, sequence)`. Identical retries keep
  the original timestamp and do not broadcast; conflicting retries do not overwrite.
- Device freshness depends on telemetry reception age, independently of socket
  connectivity. Preserve source-specific subscriptions and REST recovery.
- Preserve energy gap/restart rules, uptime-based integration, coverage, and
  null versus zero semantics. API ranges are half-open UTC intervals; UI calendar
  dates use IST (`Asia/Kolkata`). See `docs/ENERGY_METHOD.md` for exact rules.
- Wi-Fi acceptance means settings were saved and connection is pending. Preserve
  loopback/origin/intent checks and provisioning availability during DB outages.
- Do not flash hardware or change Wi-Fi as an incidental verification step.
  Host firmware tests do not replace Arduino Verify or physical board acceptance.

## Credentials and local configuration

Keep `server/.env`, private client environment files, and firmware `config.h`
private. Do not copy their values into source, documentation, logs, screenshots,
test fixtures, or responses. Never expose `DEVICE_KEY`, Wi-Fi passwords, or MongoDB
credentials to React; Vite `VITE_*` variables are browser-visible. Change example
configuration when documenting new settings and preserve working local secrets.

## Verification

Run checks appropriate to the changed behavior from `solar-monitor/`:

| Command | Purpose / prerequisites |
| --- | --- |
| `npm run check` | Syntax-checks `.js`/`.mjs`; does not compile JSX or firmware |
| `npm run test:server:unit` | Backend unit suite |
| `npm run test:client` | Client utility tests |
| `npm run build` | Vite production build, including JSX |
| `npm run test:firmware` | Firmware host harness; requires g++ or configured CXX |
| `npm test` | Full server suite, including MongoDB-memory integration prerequisites |
| `npm run test:discovery:network` | Multicast discovery checks; requires suitable networking |
| `npm run doctor` | Local environment/configuration diagnostics |

Add or update focused regression tests when changing data contracts, calculations,
retry behavior, or other substantive logic. For UI changes, inspect the affected
flow in a browser at desktop and narrow widths, including relevant failure states
and keyboard interactions. Do not claim hardware or network acceptance from unit
tests alone. Use isolated test fixtures; simulation and smoke scripts may send
readings, so check their target before running them against a configured backend.

Update affected contract/setup documentation when behavior changes. In the final
handoff, state what changed, which checks actually ran, and any remaining blockers.
