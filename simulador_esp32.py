import requests
import time
import random
import json

# Configurações do Sistema
API_URL = "http://localhost:8000/api/leituras"
API_TOKEN = "hidrobox_segredo_2026" # Deve coincidir com o .env da API
BOIA_ID = 1 # ID de uma boia existente na tua base de dados

def enviar_pacote(leituras):
    headers = {
        'X-HydroBox-Token': API_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    payload = {
        "boia_id": BOIA_ID,
        "leituras": leituras
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        print(f"Status: {response.status_code} | Resposta: {response.json()}")
    except Exception as e:
        print(f"Erro ao ligar à API: {e}")

def simular_normal():
    print("\n--- Simulando Leituras Normais (Sensores 1, 2, 3) ---")
    enviar_pacote([
        {"tipo_sensor_id": 1, "valor": 7.5}, # Oxigénio
        {"tipo_sensor_id": 2, "valor": 7.2}, # pH
        {"tipo_sensor_id": 3, "valor": 22.5} # Temp
    ])

def simular_alerta():
    print("\n--- Simulando Alerta Crítico (pH muito alto) ---")
    enviar_pacote([
        {"tipo_sensor_id": 2, "valor": 12.5} # pH fora dos limites
    ])

def simular_auto_discovery():
    print("\n--- Simulando Novo Sensor Detetado (ID 6 - Condutividade/Salinidade) ---")
    # O ID 6 existe na tabela tipos_sensor (via Seeders), mas não está associado à Boia 1.
    # Isto disparará o Auto-Discovery no Frontend.
    enviar_pacote([
        {"tipo_sensor_id": 6, "valor": 550.0} 
    ])

if __name__ == "__main__":
    print("🚀 Simulador HidroBox LoRaWAN v1.0")
    print("Certifica-te que o servidor Laravel está a correr em localhost:8000")
    
    # Executa os cenários
    simular_normal()
    time.sleep(2)
    simular_alerta()
    time.sleep(2)
    simular_auto_discovery()
    
    print("\n✅ Simulação Concluída. Verifica o Dashboard e a Agenda Técnica!")
