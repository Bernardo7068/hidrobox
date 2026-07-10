#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "mbedtls/aes.h"
#include <esp_mac.h>

// --- CONFIGURAÇÃO ---
#define TCXO_EN 12
const char* ssid = "POCO X3 NFC"; //Vodafone-DB65F2
const char* password = "60naminha"; //jTdz36hn9D
const char* serverName = "http://10.196.63.212:8000/api/leituras";
const char* apiKey = "hidrobox_segredo_2026";
const String aesKey = "HidroBoxKey2026!";

// Pinos LoRa
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26

long ultimaMsgId = 0;
String gatewayMac = ""; // Variável global para guardar o meu MAC

void decrypt(uint8_t* input, int len, uint8_t* output) {
   mbedtls_aes_context aes;
   mbedtls_aes_init(&aes);
   mbedtls_aes_setkey_dec(&aes, (const unsigned char*)aesKey.c_str(), 128);
   for (int i = 0; i < len; i += 16) {
     mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_DECRYPT, input + i, output + i);
   }
   mbedtls_aes_free(&aes);
}

void setup() {
   Serial.begin(115200);
   delay(2000);

   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(100);

   // 1. Ler o MAC
   uint8_t mac[6];
   esp_read_mac(mac, ESP_MAC_WIFI_STA);
   char macStr[18];
   sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
   gatewayMac = String(macStr);

   LoRa.setTxPower(14);       // Baixa a potência de transmissão (o padrão é 17 ou 20)
   LoRa.setSyncWord(0xF3);    // Define um ID privado para o teu projeto (evita interferências)
   LoRa.enableCrc();

   Serial.println("\n--- INICIANDO GATEWAY ---");
   Serial.println("MAC: " + gatewayMac);

   // 2. Limpeza profunda do Wi-Fi (Resolve 90% dos problemas)
   WiFi.disconnect(true); // Apaga configs guardadas
   delay(1000);
   WiFi.mode(WIFI_STA);
   WiFi.persistent(false);

   Serial.println("A ligar ao SSID: " + String(ssid));
   WiFi.begin(ssid, password);

   // 3. Aguardar com feedback detalhado
   int tentativas = 0;
   while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
     delay(1000);
     tentativas++;

     // Mostra o que está a acontecer
     int status = WiFi.status();
     Serial.print("Tentativa "); Serial.print(tentativas);
     Serial.print(" - Status: ");

     switch(status) {
       case 0: Serial.println("WL_IDLE_STATUS (Parado)"); break;
       case 1: Serial.println("WL_NO_SSID_AVAIL (SSID nao encontrado!)"); break;
       case 4: Serial.println("WL_CONNECT_FAILED (Password errada?)"); break;
       case 6: Serial.println("WL_DISCONNECTED (A tentar...)"); break;
       default: Serial.print("Codigo: "); Serial.println(status); break;
     }

     // Se o SSID não for encontrado, não vale a pena esperar 30s
     if (status == 1) break;
   }

   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\n[SUCESSO] Ligado!");
     Serial.print("IP: "); Serial.println(WiFi.localIP());
   } else {
     Serial.println("\n[FALHA] Nao foi possivel ligar ao WiFi.");
     Serial.println("DICA: Garante que o teu router tem os 2.4GHz ligados.");
   }

   // 4. Iniciar LoRa
   SPI.begin(SCK, MISO, MOSI, SS);
   LoRa.setPins(SS, RST, DIO0);
   if (!LoRa.begin(868E6)) {
     Serial.println("Erro LoRa!");
     while(1);
   }
   Serial.println("GATEWAY EM ESCUTA...");
}

void loop() {
   // Feedback para saberes que o Gateway não travou
   static unsigned long heartbeat = 0;
   if (millis() - heartbeat > 5000) {
     heartbeat = millis();
     Serial.println("Aguardando sinal LoRa... (WiFi OK)");
   }

   int packetSize = LoRa.parsePacket();
   if (packetSize) {
     Serial.print("Sinal detectado! Tamanho: ");
     Serial.print(packetSize);
     Serial.print(" bytes | RSSI: ");
     Serial.println(LoRa.packetRssi());

     if (packetSize % 16 == 0) {
       uint8_t encrypted[packetSize];
       LoRa.readBytes(encrypted, packetSize);

       uint8_t decrypted[packetSize + 1];
       decrypt(encrypted, packetSize, decrypted);

       int pad = decrypted[packetSize - 1];
       int realLen = packetSize - (pad < 16 ? pad : 0);
       decrypted[realLen] = '\0';
       String payload = String((char*)decrypted);

       StaticJsonDocument<1024> doc;
       if (deserializeJson(doc, payload) == DeserializationError::Ok) {
         long msgId = doc["msg_id"];
         String macBoia = doc["mac"];

         doc["mac_gateway"] = gatewayMac;

         if (WiFi.status() == WL_CONNECTED) {
           HTTPClient http;
           http.begin(serverName);
           http.addHeader("Content-Type", "application/json");
           http.addHeader("X-HydroBox-Token", apiKey);
           doc.remove("msg_id");
           String jsonFinal;
           serializeJson(doc, jsonFinal);

           int code = http.POST(jsonFinal);
           Serial.printf("SUCESSO! Boia [%s] -> API: %d\n", macBoia.c_str(), code);
           http.end();
           ultimaMsgId = msgId;
         }
       } else {
         Serial.println("Erro: Falha ao ler JSON (Chave AES correta?)");
       }
     } else {
       Serial.println("Sinal ignorado: Tamanho do pacote nao e multiplo de 16.");
     }
   }
}