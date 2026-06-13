// ====================================================================
// --- SENSOR DE TDS (Total Dissolved Solids) SEM BIBLIOTECA ---
// Adaptado para ESP32 (3.3V / 12-bit ADC)
// ====================================================================

#define PINO_TDS 36       // O teu pino VP
#define VREF 3.3          // Voltagem máxima do ESP32 (NÃO MUDAR PARA 5.0)
#define SCOUNT 30         // Número de amostras para filtrar o ruído

int analogBuffer[SCOUNT];    // Guarda as leituras brutas
int analogBufferTemp[SCOUNT];
int analogBufferIndex = 0;
int copyIndex = 0;

float averageVoltage = 0;
float tdsValue = 0;
float temperatura = 25.0; // Temperatura da água (fixa a 25ºC por agora)

void setup() {
  Serial.begin(115200);
  pinMode(PINO_TDS, INPUT);
  
  Serial.println("=================================");
  Serial.println("  Leitura de TDS Manual (ESP32)  ");
  Serial.println("=================================");
}

void loop() {
  // 1. LER O SENSOR A CADA 40 MILISSEGUNDOS E GUARDAR NA LISTA
  static unsigned long analogSampleTimepoint = millis();
  if(millis() - analogSampleTimepoint > 40U) {
    analogSampleTimepoint = millis();
    analogBuffer[analogBufferIndex] = analogRead(PINO_TDS);
    analogBufferIndex++;
    if(analogBufferIndex == SCOUNT) {
      analogBufferIndex = 0;
    }
  }   

  // 2. A CADA 800 MILISSEGUNDOS, FAZER AS CONTAS E MOSTRAR NO ECRÃ
  static unsigned long printTimepoint = millis();
  if(millis() - printTimepoint > 800U) {
    printTimepoint = millis();
    
    // Copiar a lista de valores para não interferir com a leitura
    for(copyIndex = 0; copyIndex < SCOUNT; copyIndex++) {
      analogBufferTemp[copyIndex] = analogBuffer[copyIndex];
    }
    
    // Obter o valor médio limpo (ignorando picos falsos)
    int valorMediano = getMedianNum(analogBufferTemp, SCOUNT);
    
    // Converter o valor limpo para Voltagem (Magia do ESP32: 4095.0 em vez de 1024.0)
    averageVoltage = valorMediano * (float)VREF / 4095.0; 
    
    // Compensação da temperatura
    float compensationCoefficient = 1.0 + 0.02 * (temperatura - 25.0);
    float compensationVoltage = averageVoltage / compensationCoefficient;  
    
    // A grande fórmula polinomial da DFRobot para calcular o TDS (ppm)
    tdsValue = (133.42 * compensationVoltage * compensationVoltage * compensationVoltage 
              - 255.86 * compensationVoltage * compensationVoltage 
              + 857.39 * compensationVoltage) * 0.5; 

    // Cinto de segurança para água extremamente limpa / sensor fora de água
    if(averageVoltage < 0.1) {
      tdsValue = 0;
    }

    // Mostrar os resultados
    Serial.print("Voltagem: ");
    Serial.print(averageVoltage, 2);
    Serial.print("V | TDS: ");
    Serial.print(tdsValue, 0); // O zero esconde as casas decimais (ppm lê-se inteiro)
    Serial.println(" ppm");
  }
}

// ====================================================================
// --- FUNÇÃO MATEMÁTICA: FILTRO MEDIANO (Remove picos de ruído) ---
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