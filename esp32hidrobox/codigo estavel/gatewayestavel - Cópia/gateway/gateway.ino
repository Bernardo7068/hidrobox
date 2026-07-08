
#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/aes.h" 

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- CONFIGURAÇÕES DE REDE ---
const char* ssid = "hidrobox";  
const char* password = "12345678";  
const char* serverName = "http://172.20.10.2:8000/api/leituras";
const char* apiKey = "hidrobox_segredo_2026";

// --- CONFIGURAÇÃO CHAVE AES ---
const String aesKey = "HidroBoxKey2026!"; 

// Pinos LoRa (LilyGO LoRa32 V3.0)
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26
#define TCXO_EN 12
#define PINO_BAT  35

// Variável global para armazenar o estado da bateria
int percBateria = 0; 

// --- FUNÇÃO AUXILIAR 1: CALCULAR BATERIA SEM REPETIR LÓGICA ---
int lerBateriaGateway() {
    float vBatPin = analogReadMilliVolts(PINO_BAT) / 1000.0;
    float vBateria = vBatPin * 2.0; 
    if (vBateria >= 4.2) return 100;
    if (vBateria <= 3.3) return 0;
    return (vBateria - 3.3) / (4.2 - 3.3) * 100;
}

// --- FUNÇÃO AUXILIAR 2: DESENHAR O HEADER FIXO DA BATERIA POR CIMA DE TUDO ---
void atualizarEcra(String linha1, String linha2 = "", String linha3 = "") {
    display.clearDisplay();
    display.setCursor(0,0);
    display.print("Bateria: "); display.print(percBateria); display.println("%");
    display.println("---------------------");
    display.println(linha1);
    if (linha2 != "") display.println(linha2);
    if (linha3 != "") display.println(linha3);
    display.display();
}

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

    if(display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
      display.setRotation(2);
      display.setTextSize(1);
      display.setTextColor(SSD1306_WHITE);
      
      percBateria = lerBateriaGateway();
      atualizarEcra("Gateway Iniciado");
    }

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
    atualizarEcra("WiFi Conectado!");
    
    Serial.print("MAC do Gateway: ");
    Serial.println(WiFi.macAddress());

    SPI.begin(SCK, MISO, MOSI, SS);
    LoRa.setPins(SS, RST, DIO0);
    if (!LoRa.begin(868E6)) {
      Serial.println("ERRO: Falha ao iniciar LoRa!");
      while(1);
    }
    Serial.println("Gateway HidroBox (AES-128) a escuta...");
    atualizarEcra("LoRa OK. A escuta...");
}

void loop() {
    static unsigned long tempoUltimoEcra = 0;

    // --- 1. ATUALIZAÇÃO DE PANO DE FUNDO (A cada 5 segundos) ---
    if (millis() - tempoUltimoEcra > 5000) {
       tempoUltimoEcra = millis();
       percBateria = lerBateriaGateway(); // Atualiza a variável global
       
       if (WiFi.status() != WL_CONNECTED) {
           WiFi.reconnect(); 
           atualizarEcra("A escuta LoRa...", "ALERTA: WiFi OFF!");
       } else {
           atualizarEcra("A escuta LoRa...");
       }
    }

    // --- 2. RECEÇÃO LORA PACOTE A PACOTE ---
    int packetSize = LoRa.parsePacket();

    if (packetSize && packetSize % 16 == 0) {
      int rssi = LoRa.packetRssi();

      uint8_t encrypted[packetSize];
      LoRa.readBytes(encrypted, packetSize);

      uint8_t decrypted[packetSize + 1];
      desencriptarAES(encrypted, decrypted, packetSize);

      int padLen = decrypted[packetSize - 1];
      int realLen = packetSize - (padLen < 16 ? padLen : 0);
      decrypted[realLen] = '\0'; 

      String recebido = String((char*)decrypted);

      Serial.println("\n--- Nova Mensagem LoRa Protegida ---");
      Serial.print("Sinal (RSSI): "); Serial.print(rssi); Serial.println(" dBm");
      Serial.println("Texto Desencriptado: " + recebido);

      // --- PARSE (Split para os 8 parâmetros da boia) ---
      int p1 = recebido.indexOf('|');
      int p2 = recebido.indexOf('|', p1 + 1);
      int p3 = recebido.indexOf('|', p2 + 1);
      int p4 = recebido.indexOf('|', p3 + 1);
      int p5 = recebido.indexOf('|', p4 + 1);
      int p6 = recebido.indexOf('|', p5 + 1);
      int p7 = recebido.indexOf('|', p6 + 1);

      if (p1 != -1 && p6 != -1 && p7 != -1) {
        String boiaMac  = recebido.substring(0, p1);
        String temp     = recebido.substring(p1 + 1, p2);
        String tds      = recebido.substring(p2 + 1, p3);
        String ec       = recebido.substring(p3 + 1, p4);
        String ph       = recebido.substring(p4 + 1, p5);
        String turb     = recebido.substring(p5 + 1, p6);
        String oxigenio = recebido.substring(p6 + 1, p7);
        String bateria  = recebido.substring(p7 + 1);

        // --- MONTAR JSON PARA A API LARAVEL ---
        JsonDocument doc;
        doc["mac"] = boiaMac;
        doc["gateway"] = WiFi.macAddress();
        doc["rssi"] = rssi;            
        doc["bateria_pct"] = bateria.toInt();
        doc["bateria_gateway"] = percBateria; 

        JsonArray leituras = doc.createNestedArray("leituras");

        auto addReading = [&](int id, String val) {
          JsonObject obj = leituras.createNestedObject();
          obj["tipo_sensor_id"] = id;
          obj["valor"] = val.toFloat();
        };

        addReading(1, oxigenio); 
        addReading(2, temp);     
        addReading(3, turb);     
        addReading(4, tds);      
        addReading(5, ph);       
        addReading(6, ec);       

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
            Serial.println("[API] SUCESSO! Telemetria completa enviada ao Laravel.");
            atualizarEcra("PACOTE RECEBIDO!", "API Laravel: OK", "Sinal: " + String(rssi) + " dBm");

            // Processamento do Downlink (Tempo de sono enviado pelo Laravel)
            String respostaApi = http.getString();
            JsonDocument docRes;

            if (deserializeJson(docRes, respostaApi) == DeserializationError::Ok) {
               if (docRes.containsKey("configuracao")) {
                  int novoIntervalo = docRes["configuracao"]["intervalo_segundos"];
                  LoRa.beginPacket();
                  LoRa.print(novoIntervalo); 
                  LoRa.endPacket();
                  LoRa.receive(); 
                  Serial.printf(">> Downlink enviado para a boia: Dormir por %d segundos.\n", novoIntervalo);
               }
            }
          } else {
            Serial.print("[API] ERRO ");
            Serial.print(httpResponseCode);
            Serial.println(": " + http.getString());
            atualizarEcra("PACOTE RECEBIDO!", "API Laravel: ERRO", "Codigo HTTP: " + String(httpResponseCode));
          }
          http.end();
        } else {
          Serial.println("ERRO: WiFi desconectado!");
          atualizarEcra("ERRO: WiFi OFF", "Pacote ignorado.");
        }
        
        // Mantém o resultado da API visível por 4 segundos antes de libertar o ecrã
        delay(4000); 
        tempoUltimoEcra = 0; 
      } else {
        Serial.println("ERRO: Falha ao segmentar os 8 campos do pacote.");
      }
    }
}

