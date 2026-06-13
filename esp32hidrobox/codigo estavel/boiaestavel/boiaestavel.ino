#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h> // Apenas para ler o MAC Address único
#include "DFRobot_ESP_EC.h"
#include "DFRobot_ESP_PH.h"

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
#define TCXO_EN 12 // <-- ADICIONADO: Pino de energia do LoRa na LilyGo V3.0

OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);
DFRobot_ESP_EC ec;
DFRobot_ESP_PH ph;

void setup() {
   Serial.begin(115200);
   delay(2000); // <-- ADICIONADO: Dá 2 segundos para o Monitor Serial abrir a tempo!

   Serial.println("\n==================================");
   Serial.println("     A INICIAR FLUXO DA BOIA      ");
   Serial.println("==================================");

   // --- ADICIONADO: LIGAR ENERGIA DO LORA ---
   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(200); // Dá tempo para o chip estabilizar a energia

   // 1. Obter MAC Address para identificação única
   WiFi.mode(WIFI_MODE_STA);
   String mac = WiFi.macAddress();
   Serial.println("Boia HidroBox Iniciada!");
   Serial.println("MAC ID: " + mac);

   sensors.begin();
   ec.begin();
   ph.begin();

   // 2. Iniciar Rádio LoRa
   SPI.begin(SCK, MISO, MOSI, SS);
   LoRa.setPins(SS, RST, DIO0);

   if (!LoRa.begin(868E6)) { // Frequência para Europa
     Serial.println("[ERRO CRÍTICO] Falha ao iniciar LoRa! Verifica as ligações.");
     // Retirado o while(1) para evitar que a placa congele para sempre em branco
   } else {
     Serial.println("LoRa pronto para transmitir de forma segura!");
   }
}

void loop() {
   Serial.println("\nA processar novas leituras...");

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

   // --- TRANSMITIR ---
   LoRa.beginPacket();
   LoRa.print(pacote);
   LoRa.endPacket();

   Serial.println(">> Enviado com sucesso: " + pacote);

   // Espera aleatória (evita colisões se tiveres mais do que uma boia na água)
   delay(10000 + random(0, 5000));
}