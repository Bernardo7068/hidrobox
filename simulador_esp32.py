import requests
import time
import random
import json

# ==============================================================================
# CONFIGURAÇÕES DO SIMULADOR HIDROBOX
# ==============================================================================
API_URL = "http://localhost:8000/api/leituras"
API_TOKEN = "hidrobox_segredo_2026"

# Dados de Identidade (Simulando hardware real)
MAC_BOIA = "F0:24:F9:AE:E1:84"      # MAC de uma boia existente ou nova
MAC_GATEWAY = "F0:24:F9:AE:E2:58"   # MAC do Hub de Rede
# ==============================================================================

def enviar_telemetria(leituras, mac_boia=MAC_BOIA, mac_gateway=MAC_GATEWAY, rssi=None):
    """
    Simula o envio de dados de um ESP32 Gateway para a API Laravel.
    """
    if rssi is None:
        rssi = random.randint(-110, -60) # Gera um sinal realista

    headers = {
        'X-HydroBox-Token': API_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    payload = {
        "mac": mac_boia,
        "gateway": mac_gateway,
        "rssi": rssi,
        "bateria_pct": random.randint(15, 100),
        "leituras": leituras
    }
    
    print(f"\n📡 [LORA] Enviando pacote de {mac_boia} via Hub {mac_gateway}...")
    print(f"📊 [RSSI] {rssi} dBm")
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f"✅ [API] SUCESSO! Resposta: {response.json().get('mensagem', 'OK')}")
        else:
            print(f"❌ [API] ERRO {response.status_code}: {response.text}")
    except Exception as e:
        print(f"⚠️ [ERRO] Falha de conexão: {e}")

def cenario_normal():
    print("\n--- CENÁRIO 1: Operação Normal ---")
    enviar_telemetria([
        {"tipo_sensor_id": 2, "valor": round(random.uniform(7.0, 7.8), 2)},  # pH
        {"tipo_sensor_id": 3, "valor": round(random.uniform(20.0, 24.0), 2)}, # Temp
        {"tipo_sensor_id": 5, "valor": round(random.uniform(0.5, 5.0), 2)}    # Turbidez
    ])

def cenario_alerta():
    print("\n--- CENÁRIO 2: Alerta de Contaminação (pH Alto) ---")
    enviar_telemetria([
        {"tipo_sensor_id": 2, "valor": 12.50}, # pH Crítico
        {"tipo_sensor_id": 3, "valor": 23.10}
    ])

def cenario_sinal_fraco():
    print("\n--- CENÁRIO 3: Hardware com Sinal Crítico ---")
    enviar_telemetria([
        {"tipo_sensor_id": 3, "valor": 21.0}
    ], rssi=-125) # Sinal muito fraco, deve disparar aviso na Agenda Técnica

def cenario_nova_boia():
    print("\n--- CENÁRIO 4: Auto-Descoberta de Novo Hardware ---")
    novo_mac = f"AA:BB:CC:{random.randint(10,99)}:{random.randint(10,99)}:{random.randint(10,99)}"
    print(f"✨ Simulando nova boia ligada agora: {novo_mac}")
    enviar_telemetria([
        {"tipo_sensor_id": 2, "valor": 7.0}
    ], mac_boia=novo_mac)

def cenario_novo_gateway():
    print("\n--- CENÁRIO 5: Auto-Descoberta de Novo Gateway ---")
    novo_gw = f"00:11:22:{random.randint(10,99)}:{random.randint(10,99)}:{random.randint(10,99)}"
    print(f"🏗️ Simulando novo Gateway instalado agora: {novo_gw}")
    enviar_telemetria([
        {"tipo_sensor_id": 2, "valor": 7.0}
    ], mac_gateway=novo_gw)

if __name__ == "__main__":
    print("========================================")
    print("   HIDROBOX - SIMULADOR IOT v2.0")
    print("========================================")
    
    try:
        cenario_normal()
        time.sleep(1)
        cenario_sinal_fraco()
        time.sleep(1)
        cenario_nova_boia()
        time.sleep(1)
        cenario_novo_gateway()
        
        print("\n✅ Simulação concluída com sucesso!")
        print("Verifique os avisos de 'Novo Hub' e 'Nova Boia' no seu Dashboard.")
    except KeyboardInterrupt:
        print("\n🛑 Simulação interrompida pelo utilizador.")
