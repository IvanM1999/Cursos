https://wokwi.com/projects/466572417984930817

#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>  
#include <ArduinoJson.h>

// Configurações de Hardware
#define DHTPIN 15
#define DHTTYPE DHT22
#define POT_PIN 34

// Configurações de Rede e MQTT
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";
const char* MQTT_SERVER = "broker.hivemq.com";
const char* MQTT_TOPIC = "zdravlje/senzori";

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

// Simulação de BPM utilizando funções trigonométricas e ruído
float simulateBPM() {
  float base = 72.0;
  float noise = (random(-50, 50)) / 10.0; [cite: 91]
  float wave = sin(millis() / 3000.0) * 8.0; [cite: 91]
  return base + wave + noise; [cite: 92]
}

// Simulação de Oxigenação do Sangue (SpO2)
float simulateSpO2() {
  float base = 97.0;
  float noise = (random(-20, 20)) / 10.0; [cite: 93]
  return constrain(base + noise, 94.0, 100.0); [cite: 93, 94]
}

// Mapeia o potenciômetro para simular Pressão Arterial
float simulateBloodPressure() {
  int raw = analogRead(POT_PIN);
  return map(raw, 0, 4095, 100, 160); [cite: 94]
}

void setup_wifi() {
  delay(10);
  Serial.print("\nConectando a rede: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("."); [cite: 95]
  }
  Serial.println("\nWiFi OK!"); [cite: 95]
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Tentando conexão MQTT...");
    if (client.connect("ESP32_zdravlje")) { [cite: 96]
      Serial.println("MQTT OK!"); [cite: 96]
    } else {
      Serial.print("Falhou, rc=");
      Serial.print(client.state());
      Serial.println(" Tentando novamente em 2 segundos...");
      delay(2000); [cite: 97]
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin(); [cite: 94]
  setup_wifi();
  client.setServer(MQTT_SERVER, 1883); [cite: 95]
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop(); [cite: 97]

  float bpm  = simulateBPM(); [cite: 97, 98]
  float spo2 = simulateSpO2(); [cite: 98]
  float bp   = simulateBloodPressure(); [cite: 99]
  float temp = dht.readTemperature(); [cite: 99]
  float hum  = dht.readHumidity(); [cite: 100]

  // Validação básica de leitura do sensor físico
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Falha ao ler o sensor DHT22!");
    temp = 0.0;
    hum = 0.0;
  }

  // Criação estruturada do JSON payload
  char msg[200];
  snprintf(msg, sizeof(msg),
    "{\"bpm\":%.1f,\"spo2\":%.1f,\"bp\":%.0f,\"temp\":%.1f,\"hum\":%.1f}",
    bpm, spo2, bp, temp, hum [cite: 100]
  );
  
  client.publish(MQTT_TOPIC, msg); [cite: 101]
  Serial.println(msg); [cite: 101]

  delay(2000); [cite: 101]
}
