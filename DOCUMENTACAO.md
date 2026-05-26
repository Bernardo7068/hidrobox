# HidroBox - Documentação Técnica e Arquitetura

Este documento descreve a estrutura central do projeto HidroBox, detalhando o modelo de dados, as hierarquias de acesso e as funcionalidades implementadas.

---

## 1. Visão Geral do Projeto
O **HidroBox** é um ecossistema de monitorização de qualidade de água composto por hardware IoT (ESP32), uma API Laravel para gestão de dados e um Dashboard React para visualização e controlo.

O projeto utiliza uma arquitetura **Multi-Tenant**, permitindo que múltiplas empresas (clientes) utilizem o sistema de forma isolada e segura.

---

## 2. Modelo de Dados e Relações (Base de Dados)

### Estrutura de Gestão
- **Empresas (Tenants):** O nó central. Tudo pertence a uma empresa.
- **Utilizadores:** Vinculados a uma empresa. Possuem diferentes permissões (Roles).
- **Zonas:** Áreas geográficas (ex: "Rio Lis") que pertencem a uma empresa.

### Estrutura de Telemetria
- **Boias (Estações):** Equipamentos físicos instalados numa zona.
- **Tipos de Sensor:** Catálogo global de parâmetros (pH, Temperatura, TDS, etc.).
- **Limites de Sensores:** Tabela de configuração onde se define, para cada boia, quais os sensores ativos e os seus limites (VLE - Valor Limite de Exposição).
- **Leituras:** Registo histórico de telemetria enviado pelo hardware.
- **Alertas:** Gerados automaticamente quando uma leitura viola os limites configurados.

---

## 3. Hierarquia de Utilizadores (Roles)

O sistema implementa 4 níveis de acesso:

| Role | Escopo | Permissões Principais |
| :--- | :--- | :--- |
| **Super Admin** | Sistema Global | Gere empresas, cria administradores, vê todas as boias de todos os clientes. |
| **Admin Empresa** | Empresa Específica | Gere a sua equipa, cria/apaga boias e zonas, configura limites de sensores. |
| **Técnico Empresa**| Empresa Específica | Resolve alertas, altera limites de sensores, monitoriza a rede (não apaga ativos). |
| **Leitor Empresa** | Empresa Específica | Apenas visualização. Vê mapas, gráficos e alertas, mas não pode alterar nada. |

---

## 4. Funcionalidades Principais

### Para Administradores de Sistema (Super Admin)
- **Dashboard Global:** Métricas de crescimento do sistema.
- **Gestão de Clientes:** Criação de novas empresas e vinculação de responsáveis legais.

### Para Gestão de Ativos (Admin/Técnico)
- **Monitorização de Rede:** Lista visual de todas as boias com indicadores de bateria e transmissão.
- **Georeferenciação:** Marcação de boias no mapa através de coordenadas ou seleção visual.
- **Ficha Técnica de Hardware:** Consulta e edição de endereços MAC e dados de localização.
- **Manutenção de Sensores:** Atribuição dinâmica de sensores a boias e definição de estados (Ativo, Erro, Calibração, OFF).

### Para Operação (Técnico/Leitor)
- **Dashboard de Operação:** Cartões de estado em tempo real com indicadores de cor para valores fora de intervalo.
- **Centro de Alertas:** Listagem de anomalias com possibilidade de resolução técnica e registo de logs.
- **Histórico e Gráficos:** Visualização temporal da evolução dos parâmetros da água.

---

## 5. Segurança e Isolamento
- **Isolamento API:** Todos os endpoints filtram os dados pelo `empresa_id` do utilizador autenticado via Sanctum.
- **Hardware Security:** A comunicação entre o ESP32 e a API é protegida por um token exclusivo (`BOIA_API_KEY`) verificado via Middleware.
- **Proteção de Acesso:** Rotas sensíveis (Delete, Update) são protegidas pelo middleware `role`, garantindo que um Técnico ou Leitor não executa ações administrativas.

---
*HidroBox - Monitorização Inteligente para um Futuro Sustentável.*
