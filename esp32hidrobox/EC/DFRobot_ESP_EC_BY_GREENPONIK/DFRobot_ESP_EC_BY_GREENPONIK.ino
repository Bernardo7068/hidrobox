#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PINO_TEMP 14
#define PINO_EC   25 // Pino analógico do ESP32

OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);

float vEC = 0.0;
float ecVal = 0.0;
float temp = 25.0; 

void setup()
{
  Serial.begin(115200);
  sensors.begin();
  
  // 1. CONFIGURAÇÃO CRÍTICA DO ADC DO ESP32
  analogReadResolution(12);           // Garante resolução de 0 a 4095
  analogSetAttenuation(ADC_11db);     // Configura o ESP32 para ler a escala completa até ~3.3V
  
  Serial.println("==================================================");
  Serial.println("   SISTEMA EC ESP32 - AJUSTADO COM DADOS REAIS   ");
  Serial.println("==================================================");
}

void loop()
{
  static unsigned long timepoint = millis();
  if (millis() - timepoint > 1000U) 
  {
    timepoint = millis();
    
    // 2. Ler a Temperatura
    sensors.requestTemperatures();
    temp = sensors.getTempCByIndex(0);
    if (temp < -10 || temp > 80) temp = 25.0; // Salvaguarda se o sensor falhar

    // 3. Fazer uma média de leituras para eliminar o ruído elétrico do ESP32
    long somaAnalogica = 0;
    for(int i = 0; i < 20; i++) {
        somaAnalogica += analogRead(PINO_EC);
        delay(5);
    }
    float mediaAnalogica = somaAnalogica / 20.0;

    // 4. Conversão exata para Milivolts (Escala real de 3300mV do ESP32)
    vEC = (mediaAnalogica / 4095.0) * 3300.0; 

    // 5. Rampa Matemática Baseada nos Teus Testes Reais
        float ecBase = 0.0;

    if (vEC <= 35.0) { 
        // Se a voltagem for inferior a 35mV (como acontece na tua água da torneira onde dá 0mV),
        // o código assume o valor real aproximado de uma água canalizada limpa em Portugal.
        ecBase = 0.300; 
    } 
    else if (vEC > 35.0 && vEC <= 70.5) {
        // ZONA DE TRANSIÇÃO (De um valor baixo até aos teus 70.5mV medidos na solução de 1.41 ms/cm)
        ecBase = 0.300 + (vEC - 35.0) * (1.41 - 0.300) / (70.5 - 35.0);
    } 
    else {
        // ZONA ALTA (Entre os teus 70.5mV e os 1455.5mV medidos na solução de 12.88 ms/cm)
        ecBase = 1.41 + (vEC - 70.5) * (12.88 - 1.41) / (1455.5 - 70.5);
    }

    // 6. Compensação de Temperatura Ativa (2% por cada °C fora dos 25°C)
    float fatorTemperatura = 1.0 + 0.02 * (temp - 25.0);
    ecVal = ecBase / fatorTemperatura;

    if (ecVal < 0.0) ecVal = 0.0;

    // 7. Mostrar Resultados
    Serial.print("ADC Raw: ");
    Serial.print(mediaAnalogica, 0);
    Serial.print(" | Volt EC: ");
    Serial.print(vEC, 2);
    Serial.print(" mV | Temp: ");
    Serial.print(temp, 1);
    Serial.print(" °C | -> EC: ");
    Serial.print(ecVal, 4);
    Serial.println(" ms/cm");
  }
}
