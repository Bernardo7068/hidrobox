#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h> // Apenas para ler o MAC Address único
#include "DFRobot_ESP_EC.h"
#include "DFRobot_ESP_PH.h"
#include "mbedtls/aes.h" // <-- ADICIONADO: Biblioteca nativa de criptografia do ESP32

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- CONFIGURAÇÃO DE PINOS ---
#define PINO_TEMP 14
#define PINO_TDS  36
#define PINO_TURB 39
#define PINO_EC   4
#define PH_PIN    35

// Pinos LoRa (LilyGO LoRa32 / Heltec)
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26
#define TCXO_EN 12 

// --- CONFIGURAÇÃO CHAVE AES ---
// Tem de ter EXATAMENTE 16 caracteres (16 bytes / 128 bits)
const String aesKey = "HidroBoxKey2026!"; 

OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);
DFRobot_ESP_EC ec;
DFRobot_ESP_PH ph;

    // ==========================================
    // Memória RTC Permanente
    // ==========================================
    RTC_DATA_ATTR int intervalo_sono = 300;

// Função auxiliar para processar a encriptação AES-128 por blocos
void encriptarAES(const uint8_t* plainText, uint8_t* output, int len) {
   mbedtls_aes_context aes;
   mbedtls_aes_init(&aes);
   mbedtls_aes_setkey_enc(&aes, (const unsigned char*)aesKey.c_str(), 128);
   
   for (int i = 0; i < len; i += 16) {
     mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_ENCRYPT, plainText + i, output + i);
   }
   mbedtls_aes_free(&aes);
}

void setup() {
   Serial.begin(115200);
   delay(2000); 

   // Inicializar OLED
   if(display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
     display.clearDisplay();
     display.setTextSize(1);
     display.setTextColor(SSD1306_WHITE);
     display.setCursor(0,0);
     display.println("Boia Iniciada");
     display.display();
   }

   Serial.println("\n==================================");
   Serial.println("   A INICIAR FLUXO DA BOIA AES    ");
   Serial.println("==================================");

   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(200); 

   WiFi.mode(WIFI_MODE_STA);
   String mac = WiFi.macAddress();
   Serial.println("Boia HidroBox Iniciada!");
   Serial.println("MAC ID: " + mac);

   sensors.begin();
   ec.begin();
   ph.begin();

   SPI.begin(SCK, MISO, MOSI, SS);
   LoRa.setPins(SS, RST, DIO0);

   if (!LoRa.begin(868E6)) { 
     Serial.println("[ERRO CRÍTICO] Falha ao iniciar LoRa! Verifica as ligações.");
   } else {
     Serial.println("LoRa pronto para transmitir em modo AES Seguro!");
   }
}

void loop() {
   Serial.println("\nA processar novas leituras...");

   display.clearDisplay();
   display.setCursor(0,0);
   display.println("A ler sensores...");
   display.display();

   // --- LEITURA DOS SENSORES ---
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

   // --- CRIAR PACOTE COMPACTO ---
   String pacote = WiFi.macAddress() + "|" +
                   String(temp, 1) + "|" +
                   String(tds, 0) + "|" +
                   String(ecVal, 2) + "|" +
                   String(phVal, 2) + "|" +
                   String(turb);

   Serial.println("Texto Limpo Original: " + pacote);

   // --- ENCRIPTAÇÃO COM PADDING (PKCS#7) ---
   int originalLen = pacote.length();
   int padLen = 16 - (originalLen % 16); // Descobre quantos bytes faltam para fechar o bloco de 16
   int paddedLen = originalLen + padLen;
   
   uint8_t plainText[paddedLen];
   pacote.getBytes(plainText, originalLen + 1);
   
   // Preenche os espaços vazios com o valor do preenchimento necessário
   for (int i = originalLen; i < paddedLen; i++) {
     plainText[i] = padLen;
   }

   // Executa a encriptação via Hardware do ESP32
   uint8_t encryptedData[paddedLen];
   encriptarAES(plainText, encryptedData, paddedLen);

   // --- TRANSMITIR RAW BYTES ---
   LoRa.beginPacket();
   LoRa.write(encryptedData, paddedLen); // Enviamos os bytes criptografados e não texto direto
   LoRa.endPacket();

   display.println("LoRa Enviado!");
   display.display();

   Serial.print(">> Pacote trancado enviado com sucesso");
   //Serial.print(paddedLen);
   //Serial.println(" bytes.");
//
   //delay(10000 + random(0, 5000));
       // ==========================================
       // NOVA JANELA DE ESCUTA (DOWNLINK)
       // ==========================================
       Serial.println("\nÀ escuta do Gateway (5 segs)...");
       long startTime = millis();
       bool recebeuResposta = false;

       while(millis() - startTime < 5000) {
           int packetSize = LoRa.parsePacket();
           if (packetSize) {
               String respostaGateway = "";
               while (LoRa.available()) {
                   respostaGateway += (char)LoRa.read();
               }
               int novoIntervalo = respostaGateway.toInt();
               if (novoIntervalo >= 60) {
                   intervalo_sono = novoIntervalo;
                   Serial.println(">> Novo tempo recebido: " + String(intervalo_sono) + "s");
               }
               recebeuResposta = true;
               break;
           }
       }

       if(!recebeuResposta) {
           Serial.println(">> Sem resposta. A manter configuração.");
       }

       // ==========================================
       // MODO HIBERNAÇÃO (DEEP SLEEP)
       // ==========================================
       uint64_t micro_segundos = intervalo_sono * 1000000ULL;
       Serial.printf("\nA entrar em Deep Sleep por %d minutos. Ate logo!\n", intervalo_sono / 60);

       display.println("Deep Sleep...");
       display.display();

       esp_sleep_enable_timer_wakeup(micro_segundos);
       esp_deep_sleep_start();
    }