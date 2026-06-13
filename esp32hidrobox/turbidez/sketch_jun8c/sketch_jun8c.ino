#define PINO_TURB 39

// Definição dos limites reais que o SEU sensor mostrou:
const int ADC_AGUA_LIMPA = 3220; // Valor medido sem nada à frente
const int ADC_AGUA_SUJA  = 10;   // Valor medido com obstáculo à frente

void setup() {
  Serial.begin(115200);
  pinMode(PINO_TURB, INPUT);
}

void loop() {
  // 1. Lê o valor bruto do sensor (Média de 20 leituras para estabilizar)
  long somaAdc = 0;
  for(int i = 0; i < 20; i++) {
    somaAdc += analogRead(PINO_TURB);
    delay(5);
  }
  int adcMedio = somaAdc / 20;

  // 2. Mapeamento direto usando os valores reais do seu hardware
  // Lembra-se: ADC alto (3220) = 0 NTU | ADC baixo (10) = 3000 NTU
  long ntu = map(adcMedio, ADC_AGUA_LIMPA, ADC_AGUA_SUJA, 0, 3000);

  // 3. Cinto de segurança para evitar valores fora do intervalo 0-3000
  ntu = constrain(ntu, 0, 3000);

  // 4. Mostra os dados no ecrã
  Serial.print("ADC Real: ");
  Serial.print(adcMedio);
  Serial.print(" | Turbidez Calibrada: ");
  Serial.print(ntu);
  Serial.println(" NTU");

  delay(1000);
}
