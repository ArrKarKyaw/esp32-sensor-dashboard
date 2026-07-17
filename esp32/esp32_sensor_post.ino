#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// Update these values with your own network and server details.
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3000/api/sensor";

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSend = 0;
const unsigned long sendInterval = 5000;

void setup() {
  Serial.begin(115200);
  dht.begin();

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (millis() - lastSend < sendInterval) {
    return;
  }
  lastSend = millis();

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor.");
    return;
  }

  float pressure = 1013.25; // Example extra sensor value.
  String deviceId = WiFi.macAddress();
  String deviceName = "ESP32-" + deviceId.substring(deviceId.length() - 5);
  String payload = "{";
  payload += "\"device_id\":\"" + deviceId + "\",";
  payload += "\"device_name\":\"" + deviceName + "\",";
  payload += "\"temperature\":" + String(temperature, 2) + ",";
  payload += "\"humidity\":" + String(humidity, 2) + ",";
  payload += "\"pressure\":" + String(pressure, 2) + ",";
  payload += "\"accel_x\":0,";
  payload += "\"accel_y\":0,";
  payload += "\"accel_z\":0,";
  payload += "\"door_status\":\"Closed\"";
  payload += "}";

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      Serial.print("POST response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("POST failed, error: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.reconnect();
  }
}
