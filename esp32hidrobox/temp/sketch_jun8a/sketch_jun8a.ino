/**
 * Código do curso Magos do Arduino para utilizar um sensor de temperatura DS18B20 com o Arduino. 
 * 
 * Imprima no monitor serial a leitura das temperaturas em graus Celcius e Fahrenheit de um 
 * sensor de temperatura DS18B20 com o Arduino.
 *
 * Este código depende da instalação de duas bibliotecas, a OneWire e a Dallas Temperature.
 * Ambas podem ser instaladas diretamente pelo gerenciador de bibliotecas do Arduino IDE.
 *
 * (c) Copyright KazaleIT
 * @kazaleitoficial no YouTube
 **/


#include <OneWire.h>
#include <DallasTemperature.h>

#define PINO_DADOS 27

// cria uma instância do OneWire para comunicação com o sensor
OneWire oneWire(PINO_DADOS);

// cria uma instância do sensor DallasTemperature passando a conexão OneWire como parâmetro
DallasTemperature sensors(&oneWire);

void setup(void) {
  // inicializa a comunicação serial
  Serial.begin(9600);

  // inicializa o sensor
  sensors.begin();
}

void loop(void) {
  // faz a requisição de leitura da temperatura
  sensors.requestTemperatures();

  Serial.print("Temperatura em graus Celsius: ");
  // imprime a temperatura em graus Celsius
  // o índice 0 é utilizado pois temos apenas um sensor e ele será o primeiro da lista
  Serial.print(sensors.getTempCByIndex(0));
  
  Serial.print(" - graus Fahrenheit: ");
  Serial.println(sensors.getTempFByIndex(0));

  // aguarda 1 segundo até a próxima leitura
  delay(1000);
}