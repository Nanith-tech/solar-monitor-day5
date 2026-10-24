# Keep the working measurement circuit

Disconnect USB and shade/disconnect the panel before changing wires. Keep the 100 ohm, 1 W load; do not replace it with a direct wire between VIN- and panel negative. That would make the 0.1 ohm shunt nearly the only load and create a short-circuit measurement.

| Connection | Purpose |
| --- | --- |
| INA219 VCC -> ESP32 3V3 | Sensor supply and 3.3 V I2C logic |
| INA219 GND -> ESP32 GND | Common reference |
| INA219 SDA -> ESP32 GPIO21 | I2C data |
| INA219 SCL -> ESP32 GPIO22 | I2C clock |
| Panel positive (red) -> INA219 VIN+ | Current enters the shunt |
| INA219 VIN- -> one end of 100 ohm resistor | Measured load-side positive node |
| Other resistor end -> panel negative (black) | Completes the current path |
| Panel negative -> INA219 GND/common ground | Voltage measurement reference |
| ESP32 Micro-USB -> laptop/USB supply | Powers ESP32 independently of panel |

The series current path is panel positive -> VIN+ -> built-in 0.1 ohm shunt -> VIN- -> external 100 ohm resistor -> panel negative. INA219 VCC is its supply pin, not the panel voltage input. GPIO21/22 are GPIO labels, not physical pin numbers.

Bus voltage is VIN- relative to common ground: approximately the external load voltage. Shunt voltage is VIN+ minus VIN-, from which INA219 measures signed current. Firmware calculates load power as bus voltage times current. Panel-side power would include the shunt drop and is not the same quantity.

With your earlier 1.23 V/12.30 mA observation, I*R = 0.0123*100 = 1.23 V and load power = 1.23*0.0123 = 0.015129 W = 15.129 mW. A raw INA219 power display near 16 mW is consistent with its measurement quantization; our telemetry uses the calculated value explicitly.

At 6 V across 100 ohms, load current would be 60 mA and resistor dissipation 0.36 W, below its 1 W rating. The panel may not sustain 6 V in your actual lighting; use measured values. Keep the USB-powered ESP32 supply independent; do not connect the raw panel directly to ESP32 3V3 or INA219 VCC.

No OLED, Raspberry Pi, battery or new sensors are required for Day 1. Use sunlight for meaningful solar measurements; weak UV illumination can produce tiny values. A small negative current near zero is preserved for diagnosis, not automatically treated as a wiring failure.

Software validation bounds do not change physical module limits. Retain the existing small panel and load for this project.
