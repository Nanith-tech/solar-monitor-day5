# Semester demonstration (5–7 minutes)

Prepare a trusted network with laptop and ESP32, matching credentials and Day 5 firmware. Keep the INA219/load wiring unchanged. Run npm ci once, then npm run dev:all. Open localhost:5173 and run npm run doctor in another terminal. Use [ACCEPTANCE](ACCEPTANCE.md) before the presentation.

1. Explain the measured path: panel → INA219/shunt → 100 Ω load; USB powers ESP32. Voltage is load-side V, current signed mA and power V × mA = mW.
2. Show HTTP 201/200 in Serial Monitor and fresh Real sensor values in the dashboard. Change light/angle and observe readings; do not claim a guaranteed nominal output.
3. Show live charts, separate browser-stream/device status, RSSI and uptime. Browser refresh/reconnect rebuilds recent history.
4. Apply Today. Explain generation versus signed net energy and coverage; show daily/weekly/monthly summaries and raw CSV. A short recent run has low daily coverage. Apply again to include new measurements.
5. Briefly stop ESP32 power: it becomes offline after the configured threshold, values remain stale, and missing time is not fabricated. Restore USB power and confirm recovery.
6. Demonstrate Wi-Fi settings only with a prepared target network. Enter ESP32 IP and target credentials in the web form, save, join target on laptop, and show fresh readings. If needed use Solar-Setup and npm run wifi:setup per WIFI_SETUP.md. Demonstrate laptop-IP rediscovery only on a network already verified to pass multicast.
7. Show doctor and the setup/troubleshooting/report files. Explain current limitations and future improvements.

For a hardware-unavailable demo, explicitly announce synthetic mode: ALLOW_SIMULATOR=true, restart normal API, then npm run simulate and select Simulator. Stop simulator to show offline behavior. These commands write labeled simulator readings into your chosen database. Do not present those rows as panel output. Return to Real sensor afterward.

Keep a screenshot/CSV from your own actual accepted run for a fallback presentation. This archive contains no seeded production readings. Stop all local apps using Ctrl+C after the demo.
