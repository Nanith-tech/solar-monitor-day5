#pragma once
#include <string>
#include <vector>
#include <map>
#include <functional>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <cmath>
#include <cstdarg>
#include <cassert>
#include <iostream>
inline uint64_t clockMs = 1000;
inline int httpStatus = 201, postCount = 0, discoveryCount = 0;
inline std::string lastPosted, lastURL;
class String {
  std::string value;
public:
  String() = default;
  String(const char* s): value(s) {}
  String(const std::string& s): value(s) {}
  String(unsigned int n): value(std::to_string(n)) {}
  size_t length() const { return value.size(); }
  const char* c_str() const { return value.c_str(); }
  char operator[](size_t n) const {return value[n];}
  int indexOf(char c) const {auto i=value.find(c);return i==std::string::npos ? -1 : static_cast<int>(i);}
  String substring(size_t a) const {return value.substr(a);}
  String substring(size_t a, size_t b) const { return value.substr(a,b-a); }
  friend String operator+(const String& a, const String& b) { return a.value+b.value; }
  friend bool operator==(const String& a, const String& b) { return a.value==b.value; }
  friend bool operator!=(const String& a, const String& b) { return !(a==b); }
};
class IPAddress {
  uint8_t bytes[4];
public:
  IPAddress(uint8_t a=0,uint8_t b=0,uint8_t c=0,uint8_t d=0): bytes{a,b,c,d} {}
  uint8_t operator[](int n) const { return bytes[n]; }
  String toString() const { return std::to_string(bytes[0])+"."+std::to_string(bytes[1])+"."+std::to_string(bytes[2])+"."+std::to_string(bytes[3]); }
};
inline unsigned long millis() { return clockMs; }
inline void delay(unsigned long ms) { clockMs+=ms; }
inline uint64_t esp_timer_get_time() { return clockMs*1000; }
inline uint32_t esp_random() { return 0x12345678; }
struct SerialClass {
 void begin(int) {} template<class T>void print(T) {} template<class T>void println(T) {}
 void printf(const char*, ...) {}
}; inline SerialClass Serial;
constexpr int WL_CONNECTED=3,WIFI_STA=1,WIFI_AP_STA=3;
struct WiFiClass {
 int state=WL_CONNECTED;
 int status(){return state;} int RSSI(){return -55;}
 IPAddress localIP(){return {192,168,43,5};} IPAddress subnetMask(){return {255,255,255,0};}
 bool ap=false; std::string ssid,pass;
 bool softAP(const char*,const char*){ap=true;return true;} void softAPdisconnect(bool){ap=false;} void disconnect(){state=0;}
 void mode(int){} void setAutoReconnect(bool){} void begin(const char* a,const char* b){ssid=a;pass=b;} void reconnect(){}
}; inline WiFiClass WiFi;
struct WiFiClient {};
struct HTTPClient {
 void setConnectTimeout(int){} void setTimeout(int){}
 bool begin(WiFiClient&, const String& url){lastURL=url.c_str();return true;}
 void addHeader(const char*,const char*){}
 int POST(uint8_t* bytes,size_t length){lastPosted.assign(reinterpret_cast<char*>(bytes),length);postCount++;return httpStatus;}
 void end(){}
};
struct WireClass { bool present=true; void begin(int,int){} void setTimeOut(int){} void beginTransmission(int){} int endTransmission(){return present?0:1;} }; inline WireClass Wire;
struct Adafruit_INA219 {
 bool valid=true; bool begin(WireClass*){return true;} void setCalibration_32V_2A(){}
 float getBusVoltage_V(){return 1.23;} float getCurrent_mA(){return 12.3;} bool success(){return valid;}
};
struct DiscoveryEntry { const char* device; const char* path; const char* version; IPAddress ip; uint16_t port; };
inline std::vector<DiscoveryEntry> discoveries;
struct MDNSClass {
 bool begin(const char*){return true;} void end(){}
 int queryService(const char*,const char*){discoveryCount++;clockMs+=3000;return discoveries.size();}
 String txt(int i,const char* key){auto& d=discoveries[i];return strcmp(key,"deviceId")==0?d.device:strcmp(key,"path")==0?d.path:d.version;}
 IPAddress address(int i){return discoveries[i].ip;} uint16_t port(int i){return discoveries[i].port;}
}; inline MDNSClass MDNS;

constexpr int HTTP_GET=0,HTTP_POST=1;
struct WebServer {
 int response=0;std::map<std::string,String> args,headers;std::map<std::string,std::function<void()>> routes;
 explicit WebServer(int){} void collectHeaders(const char**,size_t){} void begin(){} void handleClient(){}
 void on(const char* path,int,std::function<void()> handler){routes[path]=handler;}
 String arg(const char* key){return args[key];} String header(const char* key){return headers[key];}
 void send(int status,const char*,const String&){response=status;}
};
inline std::map<std::string,String> nvs;inline bool storageWorks=true;
struct Preferences {
 bool begin(const char*,bool){return true;} void end(){}
 String getString(const char* key,const char* fallback){return nvs.count(key)?nvs[key]:String(fallback);}
 size_t putString(const char* key,const String& value){if(!storageWorks)return 0;nvs[key]=value;return value.length();}
};
