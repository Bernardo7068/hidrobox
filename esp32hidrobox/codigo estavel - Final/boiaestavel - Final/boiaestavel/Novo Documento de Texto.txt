#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h> 
#include "DFRobot_ESP_PH.h"
#include "mbedtls/aes.h"
#include "EEPROM.h"
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
#define PINO_EC   34
#define PINO_BAT  35 
#define PH_PIN    25  
#define PINO_DO   15 

// Pinos LoRa
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 23
#define DIO0 26
#define TCXO_EN 12 

// --- CALIBRAÇÃO DO OXIGÉNIO (DO) ---
#define CAL1_V 1265.0   // A tua voltagem lida ao ar livre (mV)
#define CAL1_T 25.0     // Temperatura padrão de calibração (°C)

const String aesKey = "HidroBoxKey2026!"; 
String macID = ""; 

OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);
DFRobot_ESP_PH ph;

RTC_DATA_ATTR int intervalo_sono = 60;

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

   analogReadResolution(12); 
   analogSetPinAttenuation(PINO_EC, ADC_6db); 

   if(display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
     display.clearDisplay();
     display.setTextSize(1);
     display.setTextColor(SSD1306_WHITE);
     display.setCursor(0,0);
     display.println("Boia Iniciada");
     display.println("LoRa Conectado");
     display.display();
   }

   Serial.println("\n==================================");
   Serial.println("   A INICIAR FLUXO DA BOIA AES    ");
   Serial.println("==================================");

   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(200); 

   WiFi.mode(WIFI_MODE_STA);
   delay(100); 
   macID = WiFi.macAddress(); 
   WiFi.mode(WIFI_OFF);       

   Serial.println("Boia HidroBox Iniciada!");
   Serial.println("MAC ID Guardado: " + macID);

   sensors.begin();
   EEPROM.begin(64);
   ph.begin();

   SPI.begin(SCK, MISO, MOSI, SS);
   LoRa.setPins(SS, RST, DIO0);
   
   if (!LoRa.begin(868E6)) { 
     Serial.println("[ERRO CRÍTICO] Falha ao iniciar LoRa!");
   } else {
     Serial.println("LoRa pronto para transmitir em modo AES Seguro!");
   }
}

void loop() {
   Serial.println("\nA processar novas leituras...");

   display.clearDisplay();
   display.setCursor(0,0);
   display.println("A ler 6 sensores...");
   display.display();

   // --- LEITURA TEMPERATURA ---
   sensors.requestTemperatures();
   float temp = sensors.getTempCByIndex(0);
   if (temp < -10 || temp > 80) temp = 25.0; 

   // --- LEITURA BATERIA ---
   float vBatPin = analogReadMilliVolts(PINO_BAT) / 1000.0;
   float vBateria = vBatPin * 2.0; 
   int percBateria = 0;
   if (vBateria >= 4.2) percBateria = 100;
   else if (vBateria <= 3.3) percBateria = 0;
   else percBateria = (vBateria - 3.3) / (4.2 - 3.3) * 100;

   // --- LEITURA OXIGÉNIO DISSOLVIDO (Com Compensação de Temperatura) ---
   float vDO = analogRead(PINO_DO) * 3300.0 / 4095.0;
   
   // 1. Ajusta a voltagem de saturação esperada com base na temperatura atual
   float V_saturacao = CAL1_V + 35.0 * temp - CAL1_T * 35.0;
   
   // 2. Calcula o valor máximo de DO teórico para esta temperatura (Curva de solubilidade aproximada)
   float do_maximo_temperatura = 14.46 - (0.42 * temp) + (0.007 * pow(temp, 2));
   
   // 3. Aplica a proporção real lida
   float doVal = (vDO / V_saturacao) * do_maximo_temperatura;
   
   if (doVal < 0.0) doVal = 0.0;
   if (doVal > 20.0) doVal = 20.0; // Limite superior físico do sensor

   // --- LEITURA TDS e pH ---
   float vTDS = analogRead(PINO_TDS) * 3.3 / 4095.0;
   float tds = (133.42 * pow(vTDS, 3) - 255.86 * pow(vTDS, 2) + 857.39 * vTDS) * 0.5;

   float vPH = analogRead(PH_PIN) / 4095.0 * 3300.0;
   float phVal = ph.readPH(vPH, temp);
   ph.calibration(vPH, temp);

   // --- TURBIDEZ FILTRADA ---
   long somaTurb = 0;
   for(int i = 0; i < 20; i++) {
       somaTurb += analogRead(PINO_TURB);
       delay(5);
   }
   float mediaTurb = somaTurb / 20.0;
   int turb = map((int)mediaTurb, 4090, 10, 0, 3000);
   turb = constrain(turb, 0, 3000);

   // --- EC FILTRADO ---
   long somaAnalogica = 0;
   for(int i = 0; i < 20; i++) {
       somaAnalogica += analogRead(PINO_EC);
       delay(5);
   }
   float mediaAnalogica = somaAnalogica / 20.0;
   float voltageEC = (mediaAnalogica / 4095.0) * 2000.0;
   float fatorTemperatura = 1.0 + 0.02 * (temp - 25.0);
   float voltage_25C = voltageEC / fatorTemperatura;

   float ecVal = 0.0;
   if (voltage_25C > 10.0 && voltage_25C <= 64.5) {
       ecVal = 0.15 + (voltage_25C - 10.0) * (1.41 - 0.15) / (64.5 - 10.0);
   } else if (voltage_25C > 64.5) {
       ecVal = 1.41 + (voltage_25C - 64.5) * (12.88 - 1.41) / (864.0 - 64.5);
   }
   if (ecVal < 0.0) ecVal = 0.0;

   // --- CRIAR PACOTE COMPACTO ---
   String pacote = macID + "|" + String(temp, 1) + "|" + String(tds, 0) + "|" +
                   String(ecVal, 2) + "|" + String(phVal, 2) + "|" + String(turb) + "|" +
                   String(doVal, 2) + "|" + String(percBateria);

   // --- SERIAL MONITOR: LOGS COMPLETOS ---
   Serial.println("Texto Limpo Original: " + pacote);
   Serial.print("Temperatura: "); Serial.print(temp, 1); Serial.println(" C");
   Serial.print("TDS: "); Serial.print(tds, 0); Serial.println(" ppm");
   Serial.print("EC: "); Serial.print(ecVal, 2); Serial.println(" ms/cm");
   Serial.print("pH: "); Serial.println(phVal, 2);
   Serial.print("Turbidez: "); Serial.print(turb); Serial.println(" NTU");
   Serial.print("Oxigénio (DO): "); Serial.print(doVal, 2); Serial.println(" mg/L (Compensado t°)"); Serial.print(vDO, 2);
   Serial.print("Bateria: "); Serial.print(vBateria); Serial.print("V ("); Serial.print(percBateria); Serial.println("%)");

   // --- ENCRIPTAÇÃO ---
   int originalLen = pacote.length();
   int padLen = 16 - (originalLen % 16); 
   int paddedLen = originalLen + padLen;
   uint8_t plainText[paddedLen];
   pacote.getBytes(plainText, originalLen + 1);
   for (int i = originalLen; i < paddedLen; i++) plainText[i] = padLen;

   uint8_t encryptedData[paddedLen];
   encriptarAES(plainText, encryptedData, paddedLen);

   // --- TRANSMITIR ---
   LoRa.beginPacket();
   LoRa.write(encryptedData, paddedLen); 
   LoRa.endPacket();

   Serial.println(">> Pacote trancado enviado com sucesso.");

   // --- ECRÃ: ATUALIZAÇÃO FINAL COMPACTA ---
   display.clearDisplay();
   display.setCursor(0,0);
   display.print("Bateria: "); display.print(percBateria); display.println("%");
   display.println("---------------------");
   display.println("Sensores lidos: 6");
   display.println("Enviado!");
   display.display();

   // --- JANELA DE ESCUTA (DOWNLINK) ---
   Serial.println("\nÀ escuta do Gateway (5 segs)...");
   long startTime = millis();
   bool recebeuResposta = false;

   while(millis() - startTime < 5000) {
       int packetSize = LoRa.parsePacket();
       if (packetSize) {
           String respostaGateway = "";
           while (LoRa.available()) respostaGateway += (char)LoRa.read();
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

   // --- HIBERNAÇÃO ---
   uint64_t micro_segundos = intervalo_sono * 1000000ULL;
   Serial.printf("\nA entrar em Deep Sleep por %d minutos. Ate logo!\n", intervalo_sono / 60);
   
   display.println("Deep Sleep...");
   display.display();

   esp_sleep_enable_timer_wakeup(micro_segundos);
   esp_deep_sleep_start();
}