#include <OneWire.h>
#include <DallasTemperature.h>
#include "Arduino.h"
#include "DFRobot_ESP_EC.h"
#include "DFRobot_ESP_PH.h"
#include <EEPROM.h>

// ====================================================================
// --- DEFINIÇÃO DOS PINOS ---
// ====================================================================
#define PINO_TEMP 14
#define PINO_TDS  36       
#define PINO_TURB 39
#define PINO_EC   4
#define PH_PIN    35

// ====================================================================
// --- INSTÂNCIAS DOS SENSORES ---
// ====================================================================
OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);

DFRobot_ESP_EC ec;
DFRobot_ESP_PH ph;

// ====================================================================
// --- VARIÁVEIS GLOBAIS E CONFIGURAÇÕES ---
// ====================================================================
// ESP32 ADC & Voltagem
#define ESPADC 4095.0   // Resolução do ESP32
#define ESPVOLTAGE 3300 // Voltagem do ESP32 em mV
#define VREF 3.3        // Voltagem máxima do ESP32 para TDS

// Variável global para a Temperatura (usada por todos os sensores)
float temperatura_agua = 25.0; 

// Variáveis Turbidez
const int ADC_AGUA_LIMPA = 4090; 
const int ADC_AGUA_SUJA  = 10;   

// Variáveis TDS
#define SCOUNT 30 
int analogBuffer[SCOUNT];    // Faltava declarar isto no teu código
int analogBufferTemp[SCOUNT];// Faltava declarar isto
int analogBufferIndex = 0;   // Faltava declarar isto
int copyIndex = 0;           // Faltava declarar isto

// Variáveis EC e pH
float voltageEC = 0;
float ecValue = 0;
float voltagePH = 0;
float phValue = 0;

void setup() {
  Serial.begin(115200);
  
  // Inicializa Pinos
  pinMode(PINO_TDS, INPUT);
  pinMode(PINO_TURB, INPUT);

  // Inicializa Temperatura
  sensors.begin();

  // Inicializa EEPROM, EC e pH
  EEPROM.begin(32);
  ec.begin();
  ph.begin();

  Serial.println("=========================================");
  Serial.println(" HidroBox Iniciada - A ler sensores...   ");
  Serial.println("=========================================");
}

void loop() {
  // ==================================================================
  // TAREFA 1: LEITURA RÁPIDA DO TDS (A cada 40ms, NÃO BLOQUEANTE)
  // ==================================================================
  static unsigned long analogSampleTimepoint = millis();
  if(millis() - analogSampleTimepoint > 40U) {
    analogSampleTimepoint = millis();
    analogBuffer[analogBufferIndex] = analogRead(PINO_TDS);
    analogBufferIndex++;
    if(analogBufferIndex == SCOUNT) {
      analogBufferIndex = 0;
    }
  }   

  // ==================================================================
  // TAREFA 2: ATUALIZAR TODOS OS SENSORES (A cada 1000ms)
  // ==================================================================
  static unsigned long printTimepoint = millis();
  if(millis() - printTimepoint > 1000U) {
    printTimepoint = millis();
    
    Serial.println("\n--- Novas Leituras ---");

    // 1. TEMPERATURA (Lemos 1ª para compensar os outros sensores)
    sensors.requestTemperatures();
    float tempLida = sensors.getTempCByIndex(0);
    // Cinto de segurança: Se o sensor de temperatura falhar ou desligar, assume 25ºC
    if (tempLida > -10.0 && tempLida < 80.0) {
      temperatura_agua = tempLida; 
    } else {
      temperatura_agua = 25.0; 
    }
    Serial.print("Temperatura: ");
    Serial.print(temperatura_agua);
    Serial.println(" °C");

    // 2. TDS (Sólidos Dissolvidos)
    for(copyIndex = 0; copyIndex < SCOUNT; copyIndex++) {
      analogBufferTemp[copyIndex] = analogBuffer[copyIndex];
    }
    int valorMediano = getMedianNum(analogBufferTemp, SCOUNT);
    float averageVoltage = valorMediano * (float)VREF / ESPADC; 
    float compensationCoefficient = 1.0 + 0.02 * (temperatura_agua - 25.0);
    float compensationVoltage = averageVoltage / compensationCoefficient;  
    float tdsValue = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5; 
    if(averageVoltage < 0.1) tdsValue = 0;

    Serial.print("TDS: ");
    Serial.print(tdsValue, 0);
    Serial.println(" ppm");

    // 3. TURBIDEZ
    long somaAdc = 0;
    for(int i = 0; i < 20; i++) {
      somaAdc += analogRead(PINO_TURB);
      delay(2); // Reduzi o delay para não prender o código muito tempo
    }
    int adcMedio = somaAdc / 20;
    long ntu = map(adcMedio, ADC_AGUA_LIMPA, ADC_AGUA_SUJA, 0, 3000);
    ntu = constrain(ntu, 0, 3000);
    
    Serial.print("ADC Turbidez: ");
    Serial.print(adcMedio);
    Serial.print(" | Turbidez: ");
    Serial.print(ntu);
    Serial.println(" NTU");

    // 4. CONDUTIVIDADE (EC)
    voltageEC = analogRead(PINO_EC) / ESPADC * ESPVOLTAGE;
    ecValue = ec.readEC(voltageEC, temperatura_agua);
    
    Serial.print("EC: ");
    Serial.print(ecValue, 2);
    Serial.println(" ms/cm");

    // 5. pH
    voltagePH = analogRead(PH_PIN) / ESPADC * ESPVOLTAGE;
    phValue = ph.readPH(voltagePH, temperatura_agua);
    
    Serial.print("pH: ");
    Serial.println(phValue, 2);

    // 6. ROTINAS DE CALIBRAÇÃO (À escuta de comandos no Monitor Serial)
    ec.calibration(voltageEC, temperatura_agua); 
    ph.calibration(voltagePH, temperatura_agua);
  }
}

// ====================================================================
// --- FUNÇÃO MATEMÁTICA: FILTRO MEDIANO (Para o TDS) ---
// ====================================================================
int getMedianNum(int bArray[], int iFilterLen) {
  int bTab[iFilterLen];
  for (byte i = 0; i < iFilterLen; i++)
    bTab[i] = bArray[i];
  int i, j, bTemp;
  for (j = 0; j < iFilterLen - 1; j++) {
    for (i = 0; i < iFilterLen - j - 1; i++) {
      if (bTab[i] > bTab[i + 1]) {
        bTemp = bTab[i];
        bTab[i] = bTab[i + 1];
        bTab[i + 1] = bTemp;
      }
    }
  }
  if ((iFilterLen & 1) > 0)
    bTemp = bTab[(iFilterLen - 1) / 2];
  else
    bTemp = (bTab[iFilterLen / 2] + bTab[iFilterLen / 2 - 1]) / 2;
  return bTemp;
}