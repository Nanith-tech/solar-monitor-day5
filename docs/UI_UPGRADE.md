# Interactive Solar Lab UI update

## Run the complete project
1. Extract the ZIP into a fresh folder.
2. Copy your working server/.env from Day 5 into the new server folder. Copy client/.env too if you changed the API target/device ID. Preserve your private firmware/config.h when retaining a complete working folder.
3. Stop the old backend and frontend to avoid port conflicts.
4. From the solar-monitor root: npm ci, then npm run dev:all.
5. Open http://localhost:5173.

No firmware change or reupload is required for this UI update. Existing Day 5 firmware supports the Wi-Fi form. Do not commit your credentials.

## Explore
- Live view: select Solar panel, INA219, ESP32 or 100 Ω load to inspect the hardware. Load power and voltage/current come from your selected telemetry source.
- Experiment: adjust sunlight intensity and light incidence angle. Click individual cells to shade/unshade them; Clear shade and Reset restore the experiment.
- Relative output is an illustrative normalized comparison: sunlight percentage × cos(incidence angle) × unshaded fraction. It ignores panel electrical topology, bypass diodes, temperature and nonlinearity. It is not a panel-power forecast.
- The 24 cells are a visual model, not an assertion about your real panel’s cell count. Sliders do not move hardware or modify database readings.
- History, export, Wi-Fi setup and connection help remain in the dashboard. Mobile navigation scrolls horizontally. Native cells and ranges support keyboard operation. Dark controls use a pale amber focus outline; cells use white inset focus. Reduced motion disables transitions/animations and leaves eligible flow markers static.

## Verification for this update
Production build passed. Existing client unit tests: 9 passed. Backend unit suite: 31 passed, 1 physical mDNS network check skipped.
Browser fixture checks passed: component inspection, cell shading, sliders, reset, keyboard arrow input, live/experiment isolation, history presets, weekly selection, CSV download, sensor/simulator switching, Wi-Fi request and password clearing, stale device, API error/recovery, empty state, no uncaught browser errors, no page overflow at 320/390/768/1024; desktop inspected at 1440px.
Browser requests used temporary test fixtures, not a physical ESP32 or Atlas. No real radio, discovery or Atlas integration was re-tested by this UI change. Impeccable CLI context/detector were unavailable; rendered/source review was used instead.

## Files changed
client/src/components/SolarLab.jsx (new), client/src/pages/Dashboard.jsx,
client/src/styles/global.css, client/src/components/HistoryExplorer.jsx,
client/src/components/WifiSetup.jsx, client/src/main.jsx, client/package.json,
package-lock.json. Manrope is bundled locally with @fontsource/manrope.
Backend and firmware files retain the Day 5 behavior.
