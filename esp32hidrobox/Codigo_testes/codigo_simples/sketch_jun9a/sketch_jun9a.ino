#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "DFRobot_ESP_EC.h"
#include "DFRobot_ESP_PH.h"
#include <EEPROM.h>
#include <ArduinoJson.h>
#include "mbedtls/aes.h"
#include <esp_mac.h> // Adiciona isto lá no topo junto aos outros includes, se necessário

// --- CONFIGURAÇÃO ---
#define TCXO_EN 12
const String aesKey = "HidroBoxKey2026!"; // 16 bytes

// --- PINOS ---
#define PINO_TEMP 14
#define PINO_TDS  36
#define PINO_TURB 39
#define PINO_EC   4
#define PH_PIN    35
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26

// Instâncias
OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);
DFRobot_ESP_EC ec;
DFRobot_ESP_PH ph;

unsigned long msgCount = 0;
String macAddress = "";

String getMAC() {
   uint8_t mac[6];
   esp_read_mac(mac, ESP_MAC_WIFI_STA); // Agora o compilador já sabe o que isto é!
   
   char macStr[18];
   sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
   return String(macStr);
}

void encrypt(const char* plainText, uint8_t* output, int outputLen) {
   mbedtls_aes_context aes;
   mbedtls_aes_init(&aes);
   mbedtls_aes_setkey_enc(&aes, (const unsigned char*)aesKey.c_str(), 128);
   for (int i = 0; i < outputLen; i += 16) {
     mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_ENCRYPT, (const unsigned char*)(plainText + i), output + i);
   }
   mbedtls_aes_free(&aes);
}

void setup() {
   Serial.begin(115200);
   delay(2000); // Dar tempo para abrir o Monitor Serial
   
   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(500);

   WiFi.mode(WIFI_STA); // Necessário para ler o MAC
   macAddress = getMAC();

   Serial.println("\n==================================");
   Serial.println("           BOIA INICIADA          ");
   Serial.println("MEU MAC ADDRESS: " + macAddress);
   Serial.println("==================================");

   EEPROM.begin(32);
   sensors.begin();
   ec.begin();
   ph.begin();
   LoRa.setTxPower(14);       // Baixa a potência de transmissão (o padrão é 17 ou 20)
   LoRa.setSyncWord(0xF3);    // Define um ID privado para o teu projeto (evita interferências)
   LoRa.enableCrc();

   SPI.begin(SCK, MISO, MOSI, SS);
   LoRa.setPins(SS, RST, DIO0);
   if (!LoRa.begin(868E6)) {
     Serial.println("Erro LoRa!");
     while(1);
   }
}

void loop() {
   static unsigned long lastSend = 0;
   if (millis() - lastSend > 10000 || lastSend == 0) { // Enviar a cada 60s
     lastSend = millis();

     // 1. Leituras
     sensors.requestTemperatures();
     float temp = sensors.getTempCByIndex(0);
     if (temp < -10) temp = 25.0;

     float vTDS = analogRead(PINO_TDS) * 3.3 / 4095.0;
     float tds = (133.42 * pow(vTDS, 3) - 255.86 * pow(vTDS, 2) + 857.39 * vTDS) * 0.5;

     float vEC = analogRead(PINO_EC) / 4095.0 * 3300.0;
     float ecVal = ec.readEC(vEC, temp);

     float vPH = analogRead(PH_PIN) / 4095.0 * 3300.0;
     float phVal = ph.readPH(vPH, temp);

     int turb = map(analogRead(PINO_TURB), 4090, 10, 0, 3000);

     // 2. Montar JSON
     StaticJsonDocument<512> doc;
     doc["mac"] = macAddress;
     doc["msg_id"] = ++msgCount;
     doc["bateria_pct"] = 100;

     JsonArray leituras = doc.createNestedArray("leituras");
     int ids[] = {2, 3, 4, 5, 6}; // IDs na BD (Temp, Turb, TDS, pH, EC)
     float vals[] = {temp, (float)turb, tds, phVal, ecVal};

     for(int i=0; i<5; i++) {
       JsonObject obj = leituras.createNestedObject();
       obj["tipo_sensor_id"] = ids[i];
       obj["valor"] = serialized(String(vals[i], 2));
     }

     String json;
     serializeJson(doc, json);

     // 3. Padding e Encriptação
     int len = json.length();
     int pad = 16 - (len % 16);
     for (int i = 0; i < pad; i++) json += (char)pad;

     int encryptedLen = json.length();
     uint8_t encrypted[encryptedLen];
     encrypt(json.c_str(), encrypted, encryptedLen);

     // 4. Enviar LoRa
     LoRa.beginPacket();
     LoRa.write(encrypted, encryptedLen);
     LoRa.endPacket();

     Serial.println("Payload Enviado por LoRa: " + json);
   }
}