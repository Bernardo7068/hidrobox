#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include "mbedtls/aes.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- ECRÃ OLED ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- A TUA CHAVE SECRETA ---
const String aesKey = "HidroBoxKey2026!"; 
long messageCounter = 1;

// --- PINOS LORA E BATERIA ---
#define LORA_SCK 5
#define LORA_MISO 19
#define LORA_MOSI 27
#define LORA_SS 18
#define LORA_RST 23
#define LORA_DIO0 26
#define TCXO_ENABLE_PIN 12 
#define BATT_PIN 35 // <-- PINO DA BATERIA ADICIONADO

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_OFF);

  // Inicializar Ecrã OLED
  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay(); display.setTextSize(1); display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("BOIA HIDROBOX");
  display.println("--------------------");
  display.println("A iniciar rádio...");
  display.display();

  // Inicializar LoRa
  pinMode(TCXO_ENABLE_PIN, OUTPUT); digitalWrite(TCXO_ENABLE_PIN, HIGH); delay(100);
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(868E6)) {
    display.println("ERRO: LoRa Falhou!"); display.display();
    while (1);
  }
  
  display.println("LoRa OK (868MHz)");
  display.println("Modo: Simulado");
  display.display();
  delay(2000);
}

void loop() {
  // --- 1. LER BATERIA ---
  int leituraRaw = analogRead(BATT_PIN);
  float voltagem = (leituraRaw / 4095.0) * 3.3 * 2; 
  int bateriaPct = map(voltagem * 100, 320, 420, 0, 100);
  
  // Garantir que a percentagem fica entre 0 e 100
  if(bateriaPct > 100) bateriaPct = 100;
  if(bateriaPct < 0) bateriaPct = 0;

  // --- 2. GERAR DADOS SIMULADOS DA ÁGUA ---
  float temp_Real = random(150, 250) / 10.0;     
  float valor_ph = random(65, 85) / 10.0;        
  float valor_ec = random(100, 800);             
  float valor_turb = random(10, 500) / 10.0;     
  float valor_tds = random(50, 400);             

  // --- 3. MONTAR JSON ---
  StaticJsonDocument<1024> doc;
  doc["boia_id"] = 2; 
  doc["bateria_pct"] = bateriaPct; // <-- BATERIA ADICIONADA AO JSON
  doc["msg_id"] = messageCounter; 
  
  JsonArray leituras = doc.createNestedArray("leituras");
  JsonObject l2 = leituras.createNestedObject(); l2["tipo_sensor_id"] = 2; l2["valor"] = valor_ph;
  JsonObject l3 = leituras.createNestedObject(); l3["tipo_sensor_id"] = 3; l3["valor"] = temp_Real;
  JsonObject l4 = leituras.createNestedObject(); l4["tipo_sensor_id"] = 4; l4["valor"] = valor_ec;
  JsonObject l5 = leituras.createNestedObject(); l5["tipo_sensor_id"] = 5; l5["valor"] = valor_turb;
  JsonObject l6 = leituras.createNestedObject(); l6["tipo_sensor_id"] = 6; l6["valor"] = valor_tds;

  String jsonString;
  serializeJson(doc, jsonString);

  // --- 4. ENCRIPTAÇÃO AES-128 ---
  int originalLen = jsonString.length();
  int paddedLen = originalLen + (16 - (originalLen % 16)); 
  uint8_t paddedText[paddedLen];
  jsonString.getBytes(paddedText, originalLen + 1);
  for(int i = originalLen; i < paddedLen; i++) paddedText[i] = (uint8_t)(16 - (originalLen % 16));

  uint8_t encryptedData[paddedLen];
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_enc(&aes, (const unsigned char*)aesKey.c_str(), 128);

  for(int i = 0; i < paddedLen; i += 16) {
    mbedtls_aes_crypt_ecb(&aes, MBEDTLS_AES_ENCRYPT, paddedText + i, encryptedData + i);
  }
  mbedtls_aes_free(&aes);

  // --- 5. ENVIAR VIA LORA ---
  LoRa.beginPacket();
  LoRa.write(encryptedData, paddedLen);
  LoRa.endPacket();

  // --- 6. ATUALIZAR ECRÃ DA BOIA ---
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("BOIA: A EMITIR");
  display.println("--------------------");
  display.printf("Bateria: %d%%\n", bateriaPct); // <-- BATERIA NO ECRÃ
  display.printf("Pacote ID: %ld\n", messageCounter);
  display.println("Status: Enviado!");
  display.printf("Proximo em 10s...\n");
  display.display();

  messageCounter++; // Prepara o próximo ID
  delay(10000); 
}