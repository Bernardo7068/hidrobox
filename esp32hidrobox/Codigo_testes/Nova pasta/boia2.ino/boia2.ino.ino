#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "mbedtls/aes.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// --- MAPEAMENTO DE PINOS (CONFORME A TUA LISTA) ---
#define PIN_DS18B20 4   // TEMPERATURA (Digital)
#define PIN_PH      34  // PH (Analógico)
#define PIN_TURB    39  // TURBIDEZ (Analógico - Pino VN)
#define PIN_TDS     36  // TDS (Analógico - Pino VP)
#define PIN_EC      25  // CONDUTIVIDADE (Analógico)
#define PIN_DO      14  // OXIGÉNIO (Analógico)
#define BATT_ADC    35  // BATERIA
#define TCXO_EN     12  // LORA ENABLE

const String aesKey = "HidroBoxKey2026!";
const int boiaId = 2;
long msgId = 1;

Adafruit_SSD1306 display(128, 64, &Wire, -1);
OneWire oneWire(PIN_DS18B20);
DallasTemperature sensors(&oneWire);

void setup() {
   WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
   Serial.begin(115200);
   delay(3000);
   WiFi.mode(WIFI_OFF);

   Serial.println("\n>>> HIDROBOX V3.0: INICIANDO <<<");

   sensors.begin();

   pinMode(TCXO_EN, OUTPUT);
   digitalWrite(TCXO_EN, HIGH);
   delay(100);

   SPI.begin(5, 19, 27, 18);
   LoRa.setPins(18, 23, 26);
   LoRa.begin(868E6);
   LoRa.setTxPower(17);

   // Configurar pinos analógicos
   pinMode(PIN_PH, INPUT);
   pinMode(PIN_TURB, INPUT);
   pinMode(PIN_TDS, INPUT);
}

float lerMediaAnalogica(int pino) {
   long soma = 0;
   for (int i = 0; i < 30; i++) { soma += analogRead(pino); delay(5); }
   return soma / 30.0;
}

void loop() {
   Serial.println("\n--- Ciclo de Leituras ---");

   // 1. Temperatura
   sensors.requestTemperatures();
   float temp = sensors.getTempCByIndex(0);
   if (temp <= -120.0) temp = 25.0;

   // 2. Turbidez (Modo Analógico "A")
   int estado = digitalRead(PIN_TURB);

   if (estado == LOW) {
     Serial.println("Estado: LOW (LED DOUT deve estar ACESO)");
   } else {
     Serial.println("Estado: HIGH (LED DOUT deve estar APAGADO)");
   }

   // 3. TDS
   int tdsBruto = lerMediaAnalogica(PIN_TDS);
   float valorTDS = (tdsBruto < 150) ? 0 : (tdsBruto * 3.3 / 4095.0) * 500.0;

   // 4. Outros Sensores
   float valorPH = lerMediaAnalogica(PIN_PH) * (3.3 / 4095.0) * 3.5;
   float valorEC = lerMediaAnalogica(PIN_EC) * (3.3 / 4095.0) * 1000.0;
   float valorDO = lerMediaAnalogica(PIN_DO) * (3.3 / 4095.0) * 4.0;

   // 5. Bateria
   float vBatt = (analogRead(BATT_ADC) / 4095.0) * 3.3 * 2.0;
   int batPct = constrain(map(vBatt * 100, 330, 420, 0, 100), 0, 100);

   // 6. Montar JSON
   StaticJsonDocument<1024> doc;
   doc["boia_id"] = boiaId;
   doc["bateria_pct"] = batPct;
   doc["msg_id"] = msgId;
   JsonArray leituras = doc.createNestedArray("leituras");

   float vals[] = {valorDO, temp, (float)PIN_TURB, valorTDS, valorPH, valorEC};
   int ids[] = {1, 2, 3, 4, 5, 6};

   for(int i=0; i<6; i++) {
      JsonObject obj = leituras.createNestedObject();
      obj["tipo_sensor_id"] = ids[i];
      obj["valor"] = vals[i];
   }

   String jsonString;
   serializeJson(doc, jsonString);
   Serial.println("JSON: " + jsonString);

   // 7. Encriptação AES e Envio
   int originalLen = jsonString.length();
   int paddedLen = ((originalLen / 16) + 1) * 16;
   uint8_t paddedText[paddedLen];
   memset(paddedText, paddedLen - originalLen, paddedLen);
   memcpy(paddedText, jsonString.c_str(), originalLen);

   uint8_t encrypted[paddedLen];
   mbedtls_aes_context aes;
   mbedtls_aes_init(&aes);
   mbedtls_aes_setkey_enc(&aes, (const unsigned char*)aesKey.c_str(), 128);
   for(int i = 0; i < paddedLen; i += 16)
      mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_ENCRYPT, paddedText + i, encrypted + i);
   mbedtls_aes_free(&aes);

   LoRa.beginPacket();
   LoRa.write(encrypted, paddedLen);
   LoRa.endPacket();

   msgId++;
   delay(30000);
}