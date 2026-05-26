#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Credenciais da tua rede
const char* ssid = "Vodafone-DB65F2";
const char* password = "jTdz36hn9D";

// Rota local do Laravel (Confirma se o IP do teu PC ainda é o 145!)
const char* serverName = "http://192.168.1.145:8000/api/leituras"; 
const char* apiKey = "hidrobox_segredo_2026"; 

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Inicializa o ecrã OLED
  Wire.begin(21, 22);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println("Falha ao inicializar o OLED");
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("HIDROBOX - BOIA 1");
  display.println("--------------------");
  display.println("A ligar ao Wi-Fi...");
  display.display();

  // Configuração de Wi-Fi "Paciente"
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  // O loop apenas espera. Não reinicia a placa, apenas imprime pontos.
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    display.print(".");
    display.display();
  }
  
  // Sucesso na ligação!
  Serial.println("\n[+] Wi-Fi Conectado!");
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("Wi-Fi LIGADO!");
  display.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  display.display();
  delay(2000);
}

void loop() {
  // Se a rede cair no meio da operação, ele usa a reconexão nativa suave
  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi caiu. A tentar reconectar...");
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("Sem Rede!");
    display.println("A aguardar router...");
    display.display();
    
    WiFi.reconnect();
    delay(5000); // Espera 5 segundos e tenta de novo
    return;      // Pula o envio de dados até ter rede novamente
  }

  HTTPClient http;
  http.begin(serverName);
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-HydroBox-Token", apiKey); 

  // Geração de dados simulados para todo o catálogo do HidroBox
  float o2 = random(50, 95) / 10.0;         // ID 1: Oxigénio (5.0 a 9.5 mg/L)
  float ph = random(65, 85) / 10.0;         // ID 2: pH (6.5 a 8.5)
  float temp = random(150, 250) / 10.0;       // ID 3: Temperatura (15.0 a 25.0 C)
  float condutividade = random(100, 800);     // ID 4: Condutividade (100 a 800 uS/cm)
  float turbidez = random(10, 500) / 10.0;    // ID 5: Turbidez (1.0 a 50.0 NTU)
  float salinidade = random(1, 20) / 10.0;    // ID 6: Salinidade (0.1 a 2.0 psu)
  float nivel = random(10, 50) / 10.0;        // ID 7: Nível da água (1.0 a 5.0 m)
  float orp = random(100, 400);               // ID 8: ORP (100 a 400 mV)

  // Aumentado para 1024 bytes para caberem os 8 sensores sem cortar o JSON
  StaticJsonDocument<1024> doc;
  doc["boia_id"] = 1; 
  
  JsonArray leituras = doc.createNestedArray("leituras");
  
  // Anexar todos os sensores
  JsonObject l1 = leituras.createNestedObject(); l1["tipo_sensor_id"] = 1; l1["valor"] = o2;
  JsonObject l2 = leituras.createNestedObject(); l2["tipo_sensor_id"] = 2; l2["valor"] = ph;
  JsonObject l3 = leituras.createNestedObject(); l3["tipo_sensor_id"] = 3; l3["valor"] = temp;
  JsonObject l4 = leituras.createNestedObject(); l4["tipo_sensor_id"] = 4; l4["valor"] = condutividade;
  JsonObject l5 = leituras.createNestedObject(); l5["tipo_sensor_id"] = 5; l5["valor"] = turbidez;
  JsonObject l6 = leituras.createNestedObject(); l6["tipo_sensor_id"] = 6; l6["valor"] = salinidade;
  JsonObject l7 = leituras.createNestedObject(); l7["tipo_sensor_id"] = 7; l7["valor"] = nivel;
  JsonObject l8 = leituras.createNestedObject(); l8["tipo_sensor_id"] = 8; l8["valor"] = orp;

  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.print("[+] A enviar JSON 8 Sensores: ");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  // Atualiza o ecrã com um resumo (já não cabem todos no pequeno ecrã OLED)
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("DADOS ENVIADOS");
  display.printf("Total: 8 sensores\n");
  display.printf("O2:%.1f pH:%.1f T:%.1f\n", o2, ph, temp);
  display.println("--------------------");
  
  if(httpResponseCode > 0) {
    Serial.printf("[+] Resposta da API: %d\n", httpResponseCode);
    if(httpResponseCode == 200 || httpResponseCode == 201) {
      display.printf("SUCESSO (Cod: %d)\n", httpResponseCode);
    } else {
      display.printf("REJEITADO (Cod:%d)\n", httpResponseCode);
    }
  } else {
    display.printf("ERRO REDE: %d\n", httpResponseCode);
  }
  display.display();
  
  http.end();
  
  // Espera 10 segundos antes da próxima leitura
  delay(10000); 
}