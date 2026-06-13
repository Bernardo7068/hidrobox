#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/aes.h" // <-- ADICIONADO: Criptografia nativa do ESP32

// --- CONFIGURAÇÕES DE REDE ---
const char* ssid = "Vodafone-DB65F2";
const char* password = "jTdz36hn9D";
const char* serverName = "http://192.168.1.145:8000/api/leituras";
const char* apiKey = "hidrobox_segredo_2026";

// --- CONFIGURAÇÃO CHAVE AES ---
// Tem de ser EXATAMENTE a mesma chave de 16 caracteres definida na Boia
const String aesKey = "HidroBoxKey2026!"; 

// Pinos LoRa (LilyGO LoRa32 V3.0)
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26
#define TCXO_EN 12

// Função auxiliar para processar a desencriptação AES-128
void desencriptarAES(const uint8_t* encryptedText, uint8_t* output, int len) {
   mbedtls_aes_context aes;
   mbedtls_aes_init(&aes);
   mbedtls_aes_setkey_dec(&aes, (const unsigned char*)aesKey.c_str(), 128);
   
   for (int i = 0; i < len; i += 16) {
     mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_DECRYPT, encryptedText + i, output + i);
   }
   mbedtls_aes_free(&aes);
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(TCXO_EN, OUTPUT);
    digitalWrite(TCXO_EN, HIGH);
    delay(200);

    WiFi.begin(ssid, password);
    Serial.print("A ligar ao WiFi...");
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nWiFi Conectado!");
    Serial.print("MAC do Gateway: ");
    Serial.println(WiFi.macAddress());

    SPI.begin(SCK, MISO, MOSI, SS);
    LoRa.setPins(SS, RST, DIO0);
    if (!LoRa.begin(868E6)) {
      Serial.println("ERRO: Falha ao iniciar LoRa!");
      while(1);
    }
    Serial.println("Gateway HidroBox (AES-128) à escuta...");
}

void loop() {
    int packetSize = LoRa.parsePacket();

    // Verificação de segurança: pacotes AES têm de ser múltiplos de 16 bytes
    if (packetSize && packetSize % 16 == 0) {
      // --- CAPTURAR O RSSI DO PACOTE RECEBIDO ---
      int rssi = LoRa.packetRssi();

      // 1. Ler os bytes encriptados vindos do ar
      uint8_t encrypted[packetSize];
      LoRa.readBytes(encrypted, packetSize);

      // 2. Criar buffer e desencriptar
      uint8_t decrypted[packetSize + 1];
      desencriptarAES(encrypted, decrypted, packetSize);

      // 3. Remover o Padding PKCS#7 para restabelecer a String original
      int padLen = decrypted[packetSize - 1];
      int realLen = packetSize - (padLen < 16 ? padLen : 0);
      decrypted[realLen] = '\0'; 

      String recebido = String((char*)decrypted);

      Serial.println("\n--- Nova Mensagem LoRa Protegida ---");
      Serial.print("Sinal (RSSI): "); Serial.print(rssi); Serial.println(" dBm");
      Serial.println("Texto Desencriptado: " + recebido);

      // --- PARSE DA MENSAGEM (Split por '|') ---
      int p1 = recebido.indexOf('|');
      int p2 = recebido.indexOf('|', p1 + 1);
      int p3 = recebido.indexOf('|', p2 + 1);
      int p4 = recebido.indexOf('|', p3 + 1);
      int p5 = recebido.indexOf('|', p4 + 1);

      if (p1 != -1) {
        String boiaMac = recebido.substring(0, p1);
        String temp = recebido.substring(p1 + 1, p2);
        String tds = recebido.substring(p2 + 1, p3);
        String ec = recebido.substring(p3 + 1, p4);
        String ph = recebido.substring(p4 + 1, p5);
        String turb = recebido.substring(p5 + 1);

        // --- MONTAR JSON PARA A API ---
        StaticJsonDocument<1024> doc;
        doc["mac"] = boiaMac;
        doc["gateway"] = WiFi.macAddress();
        doc["rssi"] = rssi;             
        doc["bateria_pct"] = 100;

        JsonArray leituras = doc.createNestedArray("leituras");

        auto addReading = [&](int id, String val) {
          JsonObject obj = leituras.createNestedObject();
          obj["tipo_sensor_id"] = id;
          obj["valor"] = val.toFloat();
        };

        addReading(2, temp); // Temperatura
        addReading(4, tds);  // TDS
        addReading(6, ec);   // Condutividade
        addReading(5, ph);   // pH
        addReading(3, turb); // Turbidez

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        // --- ENVIAR PARA O LARAVEL ---
        if (WiFi.status() == WL_CONNECTED) {
          HTTPClient http;
          http.begin(serverName);
          http.addHeader("Content-Type", "application/json");
          http.addHeader("X-HydroBox-Token", apiKey);

          int httpResponseCode = http.POST(jsonPayload);

          if (httpResponseCode == 201 || httpResponseCode == 200) {
            Serial.println("[API] SUCESSO! Telemetria encriptada enviada e guardada.");
          } else {
            Serial.print("[API] ERRO ");
            Serial.print(httpResponseCode);
            Serial.println(": " + http.getString());
          }
          http.end();
        } else {
          Serial.println("ERRO: WiFi desconectado!");
          WiFi.reconnect();
        }
      } else {
        Serial.println("ERRO: Formato de pacote inválido pós-desencriptação.");
      }
    }
}