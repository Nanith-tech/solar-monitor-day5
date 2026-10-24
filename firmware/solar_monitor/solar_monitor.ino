#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <esp_timer.h>
#include <esp_system.h>
#include <math.h>
#include "config.h"

// Defaults keep older private config.h files compatible.
#ifndef SOLAR_DISCOVERY_ENABLED
#define SOLAR_DISCOVERY_ENABLED true
#endif
#ifndef SOLAR_DISCOVERY_INTERVAL_MS
#define SOLAR_DISCOVERY_INTERVAL_MS 10000UL
#endif
#ifndef SOLAR_MANUAL_FALLBACK
#define SOLAR_MANUAL_FALLBACK true
#endif

// GPIO numbers, not physical header positions.
Adafruit_INA219 ina219;
char bootId[33];
char pendingJson[512];
uint64_t sequence = 0;
uint64_t sampleUptimeMs = 0;
unsigned long lastSampleMs = 0;
unsigned long lastAttemptMs = 0;
unsigned long lastWifiRetryMs = 0;
unsigned int attempts = 0;
bool pending = false;
bool previouslyConnected = false;
bool sensorReady = false;
unsigned long lastSensorRetryMs = 0;
String activeTelemetryUrl;
bool mdnsReady = false;
bool endpointDiscovered = false;
unsigned long lastDiscoveryMs = 0;
unsigned int transportFailures = 0;

WebServer wifiServer(80);
String runtimeSsid, runtimePassword;
bool changeWifiPending = false, setupApActive = false;
unsigned long changeWifiAt = 0, disconnectedSince = 0, connectedSince = 0;

bool wifiSettingsValid(const String &ssid, const String &password) {
  if (ssid.length() < 1 || ssid.length() > 32) return false;
  for (size_t i=0;i<ssid.length();i++) if ((uint8_t)ssid[i] < 32 || (uint8_t)ssid[i] == 127) return false;
  if (password.length() && (password.length() < 8 || password.length() > 63)) return false;
  for (size_t i=0;i<password.length();i++) if ((uint8_t)password[i] < 32 || (uint8_t)password[i] > 126) return false;
  return true;
}

void loadWifiSettings() {
  runtimeSsid = WIFI_SSID; runtimePassword = WIFI_PASSWORD;
  Preferences prefs;
  if (!prefs.begin("solar", true)) return;
  String saved = prefs.getString("wifi", ""); prefs.end();
  int split = saved.indexOf('\n');
  if (split > 0) {
    String ssid = saved.substring(0, split), password = saved.substring(split+1);
    if (wifiSettingsValid(ssid, password)) { runtimeSsid = ssid; runtimePassword = password; }
  }
}

void startWifiSetup() {
  const char *headers[] = {"X-Device-Key"}; wifiServer.collectHeaders(headers,1);
  wifiServer.on("/solar-info", HTTP_GET, []() {
    wifiServer.send(200, "application/json", String("{\"deviceId\":\"") + DEVICE_ID + "\",\"wifiSetup\":1}");
  });
  wifiServer.on("/wifi", HTTP_POST, []() {
    if (wifiServer.header("X-Device-Key") != DEVICE_KEY) {
      wifiServer.send(401,"application/json","{\"error\":\"Unauthorized\"}"); return;
    }
    if (changeWifiPending) { wifiServer.send(409,"application/json","{\"error\":\"Busy\"}"); return; }
    String ssid = wifiServer.arg("ssid"), password = wifiServer.arg("password");
    if (!wifiSettingsValid(ssid,password)) { wifiServer.send(400,"application/json","{\"error\":\"Invalid settings\"}"); return; }
    Preferences prefs;
    if (!prefs.begin("solar", false)) { wifiServer.send(500,"application/json","{\"error\":\"Storage unavailable\"}"); return; }
    // One value makes the SSID/password pair an atomic NVS update.
    String value = ssid + "\n" + password;
    size_t written = prefs.putString("wifi", value); prefs.end();
    if (written != value.length()) { wifiServer.send(500,"application/json","{\"error\":\"Save failed\"}"); return; }
    runtimeSsid = ssid; runtimePassword = password;
    changeWifiPending = true; changeWifiAt = millis();
    wifiServer.send(202,"application/json","{\"status\":\"accepted\"}");
    Serial.println("Wi-Fi settings saved. Trying new network; credentials are not printed.");
  });
  wifiServer.begin();
}

void maintainWifiSetup() {
  wifiServer.handleClient();
  unsigned long now = millis();
  if (changeWifiPending && now-changeWifiAt >= 1000) {
    changeWifiPending = false; pending = false;
    if (mdnsReady) MDNS.end();
    mdnsReady = false; endpointDiscovered = false; activeTelemetryUrl = "";
    previouslyConnected = false; transportFailures = 0;
    WiFi.disconnect(); WiFi.begin(runtimeSsid.c_str(), runtimePassword.c_str());
    disconnectedSince = now; connectedSince = 0; lastWifiRetryMs = now;
  }
  if (WiFi.status() != WL_CONNECTED) {
    connectedSince = 0;
    if (!disconnectedSince) disconnectedSince = now;
    if (!setupApActive && now-disconnectedSince >= 30000) {
      WiFi.mode(WIFI_AP_STA);
      String name = String("Solar-Setup-") + DEVICE_ID;
      name = name.substring(0, 32);
      String password = String(DEVICE_KEY).substring(0,12);
      setupApActive = WiFi.softAP(name.c_str(),password.c_str());
      if (setupApActive) { Serial.print("Setup hotspot: "); Serial.println(name); Serial.println("Setup IP: 192.168.4.1; password = first 12 characters of DEVICE_KEY."); }
    }
  } else {
    disconnectedSince = 0;
    if (!connectedSince) connectedSince = now;
    if (setupApActive && now-connectedSince >= 60000) {
      WiFi.softAPdisconnect(true); setupApActive = false; WiFi.mode(WIFI_STA);
      Serial.println("New Wi-Fi connected; setup hotspot stopped.");
    }
  }
}

bool sameSubnet(IPAddress address) {
  IPAddress local = WiFi.localIP(), mask = WiFi.subnetMask();
  if (address[0] == 0 || address[0] == 127 || address[0] >= 224) return false;
  for (int i = 0; i < 4; i++) if ((address[i] & mask[i]) != (local[i] & mask[i])) return false;
  return true;
}

void discoverBackend(bool force = false) {
  if (!SOLAR_DISCOVERY_ENABLED || WiFi.status() != WL_CONNECTED) return;
  unsigned long now = millis();
  if (!force && now - lastDiscoveryMs < SOLAR_DISCOVERY_INTERVAL_MS) return;
  lastDiscoveryMs = now;
  if (!mdnsReady) {
    String hostname = String("solar-") + String(bootId).substring(0, 8);
    mdnsReady = MDNS.begin(hostname.c_str());
    if (!mdnsReady) { Serial.println("mDNS init failed; will retry."); return; }
  }
  int count = MDNS.queryService("solar-monitor", "tcp");
  String candidate;
  for (int i = 0; i < count; i++) {
    // A service name is not authentication. Only the configured device and
    // expected protocol/path qualify; X-Device-Key still protects ingestion.
    if (MDNS.txt(i, "deviceId") != DEVICE_ID || MDNS.txt(i, "apiVersion") != "1" ||
        MDNS.txt(i, "path") != "/api/v1/telemetry" || MDNS.port(i) == 0) continue;
    IPAddress address = MDNS.address(i);
    if (!sameSubnet(address)) continue;
    String url = String("http://") + address.toString() + ":" + String(MDNS.port(i)) + "/api/v1/telemetry";
    if (candidate.length() && candidate != url) {
      Serial.println("Multiple matching backends found; stop the older server. No endpoint selected.");
      activeTelemetryUrl = ""; endpointDiscovered = false; return;
    }
    candidate = url;
  }
  if (candidate.length()) {
    if (candidate != activeTelemetryUrl) { Serial.print("Discovered backend: "); Serial.println(candidate); }
    activeTelemetryUrl = candidate; endpointDiscovered = true; transportFailures = 0;
  } else if (!activeTelemetryUrl.length() && SOLAR_MANUAL_FALLBACK) {
    activeTelemetryUrl = TELEMETRY_URL; endpointDiscovered = false;
    Serial.print("No discovery result; trying manual fallback: "); Serial.println(activeTelemetryUrl);
  }
}


bool validIdentifier(const char *value, size_t minLength, size_t maxLength) {
  size_t length = strlen(value);
  if (length < minLength || length > maxLength) return false;
  for (size_t i = 0; i < length; i++) {
    char c = value[i];
    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') || c == '-' || c == '_')) return false;
  }
  return true;
}

uint64_t uptimeMs() {
  // 64-bit uptime avoids the 49-day millis() wrap in stored measurements.
  return static_cast<uint64_t>(esp_timer_get_time()) / 1000ULL;
}

void initializeSensor() {
  sensorReady = ina219.begin(&Wire);
  if (sensorReady) {
    ina219.setCalibration_32V_2A();
    Serial.println("INA219 ready (bus voltage at VIN-, signed shunt current).");
  } else {
    Serial.println("INA219 not found. Check 3V3/GND/SDA GPIO21/SCL GPIO22; retrying.");
  }
}

void sampleSensor() {
  if (!sensorReady) return;
  // Probe before reading so an unplugged I2C device does not become fake zeros.
  Wire.beginTransmission(0x40);
  if (Wire.endTransmission() != 0) {
    sensorReady = false;
    Serial.println("INA219 disconnected; no telemetry sample produced.");
    return;
  }
  float voltageV = ina219.getBusVoltage_V();
  bool voltageOk = ina219.success();
  float currentMA = ina219.getCurrent_mA();
  bool currentOk = ina219.success();
  float powerMW = voltageV * currentMA; // V * mA = mW, load-side power
  if (!voltageOk || !currentOk || !isfinite(voltageV) || !isfinite(currentMA) || !isfinite(powerMW) || voltageV < 0) {
    Serial.println("Invalid INA219 reading; sample skipped.");
    return;
  }
  sampleUptimeMs = uptimeMs();
  int rssiDbm = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127;
  unsigned long long sampleSequence = static_cast<unsigned long long>(sequence++);
  int count = snprintf(pendingJson, sizeof(pendingJson),
    "{\"deviceId\":\"%s\",\"bootId\":\"%s\",\"sequence\":%llu,"
    "\"voltageV\":%.4f,\"currentMA\":%.4f,\"powerMW\":%.4f,"
    "\"uptimeMs\":%llu,\"rssiDbm\":%d,\"source\":\"sensor\"}",
    DEVICE_ID, bootId, sampleSequence, voltageV, currentMA, powerMW,
    static_cast<unsigned long long>(sampleUptimeMs), rssiDbm);
  if (count < 0 || static_cast<size_t>(count) >= sizeof(pendingJson)) {
    Serial.println("Telemetry buffer overflow; sample skipped.");
    return;
  }
  attempts = 0;
  pending = true;
  // Make the first transmission eligible immediately, even across millis wrap.
  lastAttemptMs = millis() - RETRY_INTERVAL_MS;
  Serial.printf("Sample %llu: %.4f V, %.4f mA, %.4f mW\n", sampleSequence, voltageV, currentMA, powerMW);
}

void sendPending() {
  if (!pending || WiFi.status() != WL_CONNECTED || !activeTelemetryUrl.length()) return;
  // A discovery query can take seconds; never send a sample that expired during it.
  if (uptimeMs() - sampleUptimeMs > MAX_SAMPLE_AGE_MS) { pending = false; return; }
  unsigned long now = millis();
  if (now - lastAttemptMs < RETRY_INTERVAL_MS) return;
  lastAttemptMs = now;
  attempts++;
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, activeTelemetryUrl)) {
    Serial.println("Cannot begin HTTP request. Check the discovered/fallback endpoint.");
    if (attempts >= MAX_SEND_ATTEMPTS) pending = false;
    return;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  // Always resend the exact stored JSON, including RSSI, uptime and identity.
  int status = http.POST(reinterpret_cast<uint8_t *>(pendingJson), strlen(pendingJson));
  Serial.printf("HTTP attempt %u -> %d\n", attempts, status);
  if (status < 0 || status == 404) {
    if (++transportFailures >= 2) {
      activeTelemetryUrl = ""; endpointDiscovered = false;
      lastDiscoveryMs = millis() - SOLAR_DISCOVERY_INTERVAL_MS;
      Serial.println("Endpoint unavailable; rediscovering laptop.");
    }
  } else { transportFailures = 0; }
  if (status == 200 || status == 201) {
    pending = false; // 201 newly saved, 200 already saved (retry)
  } else if (status >= 400 && status < 500 && status != 429) {
    Serial.println("Request rejected. Check key, deviceId, JSON units and server config.");
    pending = false; // changing the configuration is needed; do not retry forever
  } else if (attempts >= MAX_SEND_ATTEMPTS) {
    Serial.println("Retry limit reached; dropping sample. Gap stays visible in history.");
    pending = false;
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  if (!validIdentifier(DEVICE_ID, 1, 64) || !validIdentifier(DEVICE_KEY, 32, 128) ||
      strncmp(DEVICE_KEY, "replace-", 8) == 0 || SAMPLE_INTERVAL_MS < 1000 ||
      RETRY_INTERVAL_MS < 500 || MAX_SEND_ATTEMPTS == 0 || SOLAR_DISCOVERY_INTERVAL_MS < 5000 ||
      strncmp(TELEMETRY_URL, "http://", 7) != 0) {
    Serial.println("Edit config.h: valid ID/key, local http URL and sensible intervals required.");
    while (true) delay(1000);
  }
  // Fresh random identity each boot; retries within a boot retain their sequence.
  snprintf(bootId, sizeof(bootId), "%08lx%08lx%08lx%08lx",
    static_cast<unsigned long>(esp_random()), static_cast<unsigned long>(esp_random()),
    static_cast<unsigned long>(esp_random()), static_cast<unsigned long>(esp_random()));
  Wire.begin(21, 22);
  Wire.setTimeOut(100);
  initializeSensor();
  if (!SOLAR_DISCOVERY_ENABLED && SOLAR_MANUAL_FALLBACK) activeTelemetryUrl = TELEMETRY_URL;
  if (!SOLAR_DISCOVERY_ENABLED && !SOLAR_MANUAL_FALLBACK) {
    Serial.println("Enable discovery or manual fallback in config.h."); while (true) delay(1000);
  }
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  loadWifiSettings();
  WiFi.begin(runtimeSsid.c_str(), runtimePassword.c_str());
  startWifiSetup();
  disconnectedSince = millis();
  lastSampleMs = millis() - SAMPLE_INTERVAL_MS;
  Serial.println("Connecting Wi-Fi. Telemetry goes to laptop; authenticated Wi-Fi setup listens on port 80.");
}

void loop() {
  maintainWifiSetup();
  unsigned long now = millis();
  bool connected = WiFi.status() == WL_CONNECTED;
  if (connected && !previouslyConnected) {
    Serial.print("Wi-Fi connected. ESP32 IP: "); Serial.println(WiFi.localIP());
    activeTelemetryUrl = SOLAR_DISCOVERY_ENABLED ? "" : String(TELEMETRY_URL);
    discoverBackend(true);
  }
  if (!connected && previouslyConnected) {
    if (mdnsReady) MDNS.end();
    mdnsReady = false; endpointDiscovered = false; activeTelemetryUrl = ""; transportFailures = 0;
  }
  // Once discovered, re-query on reconnect or transport failure. Fallback
  // endpoints continue discovery periodically so they can switch automatically.
  if (connected && !endpointDiscovered) discoverBackend();
  if (!connected && now - lastWifiRetryMs >= WIFI_RETRY_MS) {
    lastWifiRetryMs = now;
    Serial.println("Wi-Fi reconnect attempt...");
    WiFi.reconnect();
  }
  previouslyConnected = connected;
  if (!sensorReady && now - lastSensorRetryMs >= WIFI_RETRY_MS) {
    lastSensorRetryMs = now;
    initializeSensor();
  }
  if (pending && uptimeMs() - sampleUptimeMs > MAX_SAMPLE_AGE_MS) {
    pending = false;
    Serial.println("Stale unsent sample dropped; no offline backlog is fabricated.");
  }
  // One in-memory pending sample. Retries may delay cadence; no flash queue yet.
  if (!pending && now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    sampleSensor();
  }
  sendPending();
  delay(10);
}
