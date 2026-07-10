#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- CONFIGURAÇÃO DOS TEUS PINOS REAIS ---
#define PINO_EC   34  
#define PINO_TEMP 14  

OneWire oneWire(PINO_TEMP);
DallasTemperature sensors(&oneWire);

float voltage = 0.0;
float ec_ms = 0.0;
float ec_us = 0.0;
float temperature = 25.0; 

void setup()
{
  Serial.begin(115200);
  sensors.begin();     

  analogReadResolution(12); 
  // Mantém a tua configuração de 6dB que salvou o pino 34
  analogSetPinAttenuation(PINO_EC, ADC_6db); 

  Serial.println("==================================================");
  Serial.println("     SISTEMA EC ESP32 - MATEMÁTICA PURA ATIVA     ");
  Serial.println("==================================================");
}

void loop()
{
  static unsigned long timepoint = millis();
  if (millis() - timepoint > 1000U) 
  {
    timepoint = millis();

    // 1. Ler a Temperatura real da sonda DS18B20
    sensors.requestTemperatures();
    temperature = sensors.getTempCByIndex(0);
    if (temperature < -10 || temperature > 80) temperature = 25.0; // Salvaguarda

    // 2. Média de 20 leituras analógicas para esmagar o ruído do ESP32
    long somaAnalogica = 0;
    for(int i = 0; i < 20; i++) {
        somaAnalogica += analogRead(PINO_EC);
        delay(5);
    }
    float mediaAnalogica = somaAnalogica / 20.0;

    // 3. Converter para Milivolts (Régua de 6dB = 0 a 2000mV)
    voltage = (mediaAnalogica / 4095.0) * 2000.0;
    
    // 4. Normalizar a voltagem para 25°C (Compensação Térmica Física de 2% por grau)
    // A condutividade sobe com o calor, logo dividimos para saber quanto daria a 25°C
    float fatorTemperatura = 1.0 + 0.02 * (temperature - 25.0);
    float voltage_25C = voltage / fatorTemperatura;

    // 5. RAMPA MATEMÁTICA MANUAL (Baseada estritamente nos teus testes)
    float ecBase = 0.0;

    if (voltage_25C <= 10.0) { 
        // Sonda seca ou fora de água
        ecBase = 0.0;
    } 
    else if (voltage_25C > 10.0 && voltage_25C <= 64.5) {
        // ZONA DA ÁGUA DOCE (Até à tua leitura da solução de 1.41 ms/cm)
        ecBase = 0.15 + (voltage_25C - 10.0) * (1.41 - 0.15) / (64.5 - 10.0);
    } 
    else {
        // ZONA DA ÁGUA SALGADA (Mapeada exatamente para os teus ~899.15mV na solução de 12.88 ms/cm)
        // Corrigido para a base de 25°C que dá aproximadamente 864.0 mV virtuais
        ecBase = 1.41 + (voltage_25C - 64.5) * (12.88 - 1.41) / (864.0 - 64.5);
    }

    // 6. Atribuição das duas unidades pedidas
    ec_ms = ecBase;
    ec_us = ec_ms * 1000.0;

    if (ec_ms < 0.0) { ec_ms = 0.0; ec_us = 0.0; }

    // 7. MOSTRAR APENAS OS PRINTS LIMPOS E DIRETOS
    Serial.print("Volt: ");
    Serial.print(voltage, 1);
    Serial.print(" mV | Temp: ");
    Serial.print(temperature, 1);
    Serial.print(" C | EC: ");
    Serial.print(ec_ms, 2);
    Serial.print(" ms/cm  ->  ");
    Serial.print(ec_us, 0); 
    Serial.println(" us/cm");
  }
}
