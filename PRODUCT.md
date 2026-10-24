# Solar Monitor
A college IoT prototype that observes load-side voltage/current from an INA219 connected to ESP32, stores authenticated HTTP telemetry through Express in MongoDB Atlas, and displays it in React.

Users operate the app on their backend laptop, often on a phone hotspot. Accurate units, source separation and honest offline states matter. The physical panel supplies a 100 Ω resistor; USB powers ESP32 independently. This system does not measure irradiance, panel efficiency or maximum available power.

The interactive panel is a 24-cell visual model, not the exact physical panel geometry. Experiment mode is a local educational comparison only, never a source of saved sensor values or hardware commands. Wi-Fi provisioning requires a reachable board and the existing Day 5 firmware.

Preserve backend/firmware contracts, timestamps, retries, signed current, energy-gap rules and cloud configuration. Deliver complete source ZIPs with Windows instructions. Test fixtures do not ship as automatic fallback measurements.
