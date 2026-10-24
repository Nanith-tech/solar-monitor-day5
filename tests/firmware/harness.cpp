#include "Arduino.h"
#include "solar_monitor.ino"
int main() {
 setup(); assert(strlen(bootId)==32);
 discoveries={{"other","/api/v1/telemetry","1",{192,168,43,10},4000}, {DEVICE_ID,"/wrong","1",{192,168,43,10},4000}, {DEVICE_ID,"/api/v1/telemetry","1",{10,0,0,4},4000}};
 discoverBackend(true); assert(!endpointDiscovered);assert(activeTelemetryUrl==TELEMETRY_URL);
 discoveries={{DEVICE_ID,"/api/v1/telemetry","1",{192,168,43,10},4000}};
 discoverBackend(true);assert(endpointDiscovered);assert(activeTelemetryUrl=="http://192.168.43.10:4000/api/v1/telemetry");
 sampleSensor();std::string json=pendingJson;httpStatus=-1;sendPending();assert(pending);assert(lastPosted==json);
 clockMs+=RETRY_INTERVAL_MS;sendPending();assert(activeTelemetryUrl.length()==0);assert(lastPosted==json);
 discoveries={{DEVICE_ID,"/api/v1/telemetry","1",{192,168,43,20},4500}};
 discoverBackend(true);assert(activeTelemetryUrl=="http://192.168.43.20:4500/api/v1/telemetry");
 sampleSensor();httpStatus=200;sendPending();assert(!pending);assert(lastURL=="http://192.168.43.20:4500/api/v1/telemetry");
 sampleSensor();httpStatus=401;sendPending();assert(!pending);assert(endpointDiscovered);
 sampleSensor();int oldPosts=postCount;clockMs+=MAX_SAMPLE_AGE_MS+1;sendPending();assert(!pending);assert(postCount==oldPosts);
 discoveries.push_back({DEVICE_ID,"/api/v1/telemetry","1",{192,168,43,30},4000});discoverBackend(true);assert(activeTelemetryUrl.length()==0);
 discoveries.clear();previouslyConnected=true;WiFi.state=0;loop();assert(!mdnsReady);assert(!endpointDiscovered);
 WiFi.state=WL_CONNECTED;discoveries={{DEVICE_ID,"/api/v1/telemetry","1",{192,168,43,40},4000}};loop();assert(endpointDiscovered);
 pending=false;Wire.present=false;sampleSensor();assert(!pending);assert(!sensorReady);
 assert(!wifiSettingsValid("", "password"));assert(!wifiSettingsValid("Home", "short"));
 wifiServer.args={{"ssid","New hotspot"},{"password","valid-pass"}};
 wifiServer.routes["/wifi"](); assert(wifiServer.response==401); assert(nvs.empty());
 wifiServer.headers["X-Device-Key"]=DEVICE_KEY;
 storageWorks=false;wifiServer.routes["/wifi"]();assert(wifiServer.response==500);assert(!changeWifiPending);
 storageWorks=true;wifiServer.routes["/wifi"]();assert(wifiServer.response==202);assert(changeWifiPending);
 wifiServer.routes["/wifi"]();assert(wifiServer.response==409);
 clockMs+=1001;maintainWifiSetup();assert(!changeWifiPending);assert(WiFi.ssid=="New hotspot");assert(WiFi.pass=="valid-pass");
 runtimeSsid="";runtimePassword="";loadWifiSettings();assert(runtimeSsid=="New hotspot");assert(runtimePassword=="valid-pass");
 clockMs+=30001;maintainWifiSetup();assert(setupApActive);assert(WiFi.ap);
 WiFi.state=WL_CONNECTED;maintainWifiSetup();clockMs+=60001;maintainWifiSetup();assert(!setupApActive);assert(!WiFi.ap);
 std::cout<<"PASS: actual sketch under host stubs: discovery filtering/fallback, changed IP/port, retry identity, 401, stale samples, ambiguity, Wi-Fi recovery, disconnected sensor, authenticated Wi-Fi save/storage failure/reload, deferred switch and setup AP recovery. Not an ESP32 board compile.\n";
}
