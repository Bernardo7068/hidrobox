# 🛠️ Manual do Desenvolvedor: HydroBox (Stack Técnica)

Este documento compila as dependências, bibliotecas utilizadas e os comandos vitais de cada um dos 4 pilares de software do ecossistema HydroBox.

---

## 🛑 Pré-Requisitos do Sistema
Antes de executares qualquer comando listado neste manual, o ambiente de desenvolvimento deve conter:
- **Node.js (v18+) e NPM:** Necessário para o Frontend (React) e para o Microserviço de WebSockets.
- **PHP (v8.2+) e Composer:** Necessário para instalar dependências e correr a API em Laravel.
- **Arduino IDE (v2.0+) ou PlatformIO:** Necessário para compilar e injetar o código nos microcontroladores ESP32.
- **Git:** Recomendado para gestão de versões e clonagem do repositório.

---

## 1. 🖥️ Frontend (Interface do Utilizador)
**Localização:** `/frontend`

A aplicação cliente (Single Page Application) foi construída para ser reativa e visualmente moderna, garantindo fluidez sem recarregamentos de página.

### 📦 Bibliotecas e Tecnologias Principais:
- **React & Vite:** Motor principal baseado em Hooks e compilador bundler ultra-rápido.
- **Tailwind CSS:** Framework utilitária para o design visual.
- **Axios:** Cliente HTTP para comunicar de forma assíncrona com a API.
- **Socket.io-client:** Conexão aos eventos em tempo real do servidor Node.js.
- **Leaflet, React-Leaflet & Recharts:** Renderização de mapas geográficos e gráficos analíticos.
- **Vite PWA Plugin:** Permite instalação no telemóvel como app nativa progressiva.

### 🚀 Comandos de Terminal (Frontend)

#### Passo 1: Instalação e Configuração Inicial (Construção do zero)

| Comando | Descrição Operacional |
| :--- | :--- |
| `npm create vite@latest . -- --template react` | Cria a estrutura base do projeto React com Vite. |
| `npm install axios react-leaflet leaflet recharts socket.io-client @heroicons/react` | Instala as bibliotecas específicas (gráficos, mapas, websockets e ícones). |
| `npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa` | Instala o Tailwind CSS e o plugin PWA como dependências de desenvolvimento. |
| `npx tailwindcss init -p` | Gera os ficheiros de configuração do Tailwind e PostCSS. |

#### Passo 2: Execução Diária (Para testar e compilar)

| Comando | Descrição Operacional |
| :--- | :--- |
| `npm install` | Instala e repara todas as dependências a partir do package.json. |
| `npm run dev` | Inicia o servidor local de desenvolvimento. |
| `npm run dev --host` | **[CRUCIAL]** Abre o servidor e aceita conexoes de qualquer ip |
| `npm run build` | Compila, minifica e empacota o código React para ambiente de produção. |

---

## 2. ⚙️ API (Cérebro do Sistema e Base de Dados)
**Localização:** `/api`

O Backend atua como a sentinela do sistema. Baseado na arquitetura MVC, garante a validação estrita dos dados que chegam do terreno, o isolamento das empresas (Multi-Tenant) e a autenticação humana.

### 📦 Bibliotecas e Tecnologias Principais:
- **PHP 8.3 & Laravel 11:** O núcleo da API RESTful e do motor ORM (Eloquent).
- **Laravel Sanctum:** Emissão e validação de Tokens Bearer para proteção de rotas.
- **MySQL:** O motor de base de dados relacional.
- **DomPDF & GuzzleHTTP:** Processamento de relatórios PDF e disparo de Webhooks.

### 🚀 Comandos de Terminal (API Laravel)

#### Passo 1: Instalação e Configuração Inicial (Construção do zero)

| Comando | Descrição Operacional |
| :--- | :--- |
| `composer create-project laravel/laravel .` | Inicializa o projeto vazio do Laravel na pasta. |
| `php artisan install:api` | Instala o Sanctum, publica as migrações e prepara as rotas de API (Laravel 11). |
| `php artisan migrate` | Atualiza a base de dados (cria todas as tabelas e relações necessárias). |

#### Passo 2: Execução Diária (Para testar e compilar)

| Comando | Descrição Operacional |
| :--- | :--- |
| `composer install` | Instala as dependências base PHP a partir do composer.json. |
| `php artisan migrate:fresh --seed` | Apaga a base de dados, reconstrói as tabelas e injeta dados de teste. |
| `php artisan serve` | Liga o servidor nativo na porta localhost:8000. |
| `php artisan serve --host=0.0.0.0` | **[CRUCIAL]** Permite que dispositivos da rede local e o Gateway acedam à API. |
| `php artisan tinker` | Abre a consola interativa de testes à base de dados. |

---

## 3. 📡 WebSockets (Microserviço de Tempo Real)
**Localização:** `/websockets`

Este microserviço é um Broadcaster puro. Opera como mediador recebendo o aviso do Laravel e distribuindo as notificações para os navegadores instantaneamente.

### 📦 Bibliotecas e Tecnologias Principais:
- **Node.js & Express:** Ambiente de execução e mini-servidor web.
- **Socket.io:** Mantém túneis TCP abertos com os clientes (React).
- **Cors & Dotenv:** Regras de segurança de rede e carregamento de chaves secretas.

### 🚀 Comandos de Terminal (WebSockets)

#### Passo 1: Instalação e Configuração Inicial (Construção do zero)

| Comando | Descrição Operacional |
| :--- | :--- |
| `npm init -y` | Inicia a pasta como um projeto Node.js em branco. |
| `npm install express socket.io cors dotenv` | Instala os módulos principais necessários para o funcionamento. |
| `npm install -D nodemon` | Instala a ferramenta de "Vigia" para desenvolvimento ativo. |

#### Passo 2: Execução Diária (Para testar e compilar)

| Comando | Descrição Operacional |
| :--- | :--- |
| `npm install` | Instala as dependências a partir do package.json após clonar o projeto. |
| `node server.js` | Inicia o servidor em modo oficial (Produção). Ocupa a porta 3001. |
| `npm run dev` | Inicia via nodemon. (Requer adicionar `"dev": "nodemon server.js"` aos scripts do package.json). |

---

## 4. 🎛️ Firmware (Gateway e Boia Sensorial)
**Localização:** `/firmware`

O código C++ (Arduino) embarcado nos microcontroladores ESP32, encarregue do contacto físico com a água e com a rede rádio.

### 📦 Bibliotecas Principais:
- **LoRa.h & SPI.h:** Gestão do transceptor rádio de 868 MHz e empacotamento binário.
- **mbedtls (Nativa):** Encriptação simétrica AES-128 via hardware.
- **OneWire & DallasTemperature:** Comunicação digital térmica.
- **DFRobot_ESP_PH & ArduinoJson:** Compensação do pH e estruturação JSON.
- **HTTPClient & WiFi.h:** Ferramentas do Gateway para submeter pacotes HTTP seguros.

---

## 🔐 Configuração das Variáveis de Ambiente (.env)

Por razões de segurança, os ficheiros `.env` nunca são enviados para o repositório Git. Terás de criar manualmente um ficheiro `.env` na raiz de cada um dos três projetos de software e configurar as seguintes pontes de comunicação:

### 1. Variáveis da API (Laravel)
**Ficheiro:** `/api/.env`

```env
APP_NAME=HydroBox
APP_ENV=local
APP_URL=http://localhost:8000

# Conexão à Base de Dados MySQL
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hydrobox_db
DB_USERNAME=root
DB_PASSWORD=tua_password_aqui

# Endereço do Servidor WebSockets para envio de Webhooks
WS_SERVER_URL=http://127.0.0.1:3001/api/broadcast

# Token de Segurança (Obrigatório bater certo com o código do Gateway)
GATEWAY_SECRET_TOKEN=HydroBoxKey2026!
```

### 2. Variáveis dos WebSockets (Node.js)
**Ficheiro:** `/websockets/.env`

```env
# Porta de Operação do Node.js
PORT=3001

# Qual é o endereço do Frontend que tem permissão para se conectar?
CORS_ORIGIN=http://localhost:5173

# Chave secreta para garantir que os avisos vêm mesmo da API Laravel
LARAVEL_SECRET=HydroBoxKey2026!
```

### 3. Variáveis do Frontend (React / Vite)
**Ficheiro:** `/frontend/.env` (ou `.env.local`)

```env
# Endereço central da API Laravel
VITE_API_BASE_URL=http://localhost:8000/api

# Endereço do Servidor de WebSockets (Node.js)
VITE_WS_SERVER_URL=http://localhost:3001
```

> **Nota Adicional para Testes Locais:** Se fores testar a plataforma no telemóvel através da tua rede Wi-Fi, deverás substituir os endereços `localhost` ou `127.0.0.1` nestes ficheiros pelo endereço IP local do teu computador (por exemplo, `192.168.1.87`).

---

## 🔗 O Fluxo da Arquitetura em Ação

Para compreender como as 4 peças comunicam de forma encadeada no ecossistema:

1. **O Nó Sensor (Boia)** acorda, capta os dados da água, encripta-os e emite-os num pacote rádio (LoRa) a 868 MHz.
2. **O Gateway IoT** em terra interceta o sinal rádio, desencripta-o, converte-o para JSON e efetua um POST HTTP com token para a API (Laravel).
3. **A API** valida, regista os dados, verifica limites ecológicos e gera alertas na base de dados MySQL. Seguidamente, dispara um POST HTTP silencioso ao Microserviço WebSockets (Node.js).
4. **O Node.js** reencaminha essa mensagem via túnel WS apenas para os dispositivos corretos, aplicando isolamento Multi-Tenant.
5. **O Frontend (React)** interceta o evento e atualiza automaticamente os gráficos e cartões no ecrã, sem necessidade de o utilizador recarregar a página.
