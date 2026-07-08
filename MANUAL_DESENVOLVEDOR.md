# 🛠️ Manual do Desenvolvedor: HidroBox (Stack Técnica)

Este documento compila as dependências, bibliotecas utilizadas e os comandos vitais de cada um dos 3 pilares de software do projeto HidroBox.

---

## 1. 🖥️ Frontend (Interface do Utilizador)
**Localização:** `/frontend`

A aplicação cliente foi construída para ser rápida, reativa e visualmente moderna (estilo Dashboard), compatível com computadores e telemóveis.

### 📦 Bibliotecas e Tecnologias Principais:
- **React 19:** O "motor" da interface (baseado em Hooks funcionais).
- **Vite:** O compilador ultra-rápido que empacota o código React.
- **Tailwind CSS v3/v4:** Framework de CSS utilitário usado para desenhar 100% do visual (Dark modes, gradientes, responsividade e escalas móveis).
- **Axios:** Cliente HTTP principal para comunicar de forma assíncrona com a API do Laravel.
- **Socket.io-client:** Responsável por escutar e conectar aos eventos em tempo real do servidor NodeJS.
- **Leaflet & React-Leaflet:** Usados na secção "Mapa das Estações" para renderizar os mapas com as localizações GPS.
- **Recharts:** Biblioteca modular usada para gerar os gráficos interativos de histórico de parâmetros da água.
- **Vite PWA Plugin:** Permite que a aplicação seja instalada nos ecrãs de telemóvel (como uma app nativa progressiva).

### 🚀 Comandos Importantes:
*Dica: Abre a linha de comandos na pasta `frontend`.*
- `npm install` : Instala todas as dependências pela primeira vez.
- `npm run dev` : Inicia o ambiente de desenvolvimento local (para testares no PC).
- `npm run dev --host` : **(Crucial)** Inicia o servidor, mas abre-o à tua rede Wi-Fi para poderes testar com o teu smartphone!
- `npm run build` : Compila e empacota o código para produção (quando fores lançar o projeto online).

---

## 2. ⚙️ API (Cérebro do Sistema e Base de Dados)
**Localização:** `/api`

O Backend foi construído numa framework robusta para garantir validação de dados avançada, lógica de negócio complexa, Proteção Multi-Tenant (isolamento de empresas) e autenticação.

### 📦 Bibliotecas e Tecnologias Principais:
- **PHP 8.3 & Laravel 11/13:** O núcleo do backend, usando a arquitetura MVC (Model-View-Controller).
- **Laravel Sanctum:** O "segurança" do sistema. Gera e verifica os Tokens Bearer (para autenticação).
- **SQLite / MySQL:** A base de dados relacional que guarda todo o historial (Leituras, Boias, Alertas).
- **GuzzleHTTP / Laravel Http:** Usado internamente para o Laravel disparar os *Webhooks* (avisos) para o servidor de WebSockets.

### 🚀 Comandos Importantes:
*Dica: Abre a linha de comandos na pasta `api`.*
- `composer install` : Instala todas as dependências PHP do ecossistema Laravel.
- `php artisan serve` : Liga o servidor web do Laravel para desenvolvimento.
- `php artisan serve --host=0.0.0.0` : **(Crucial)** Liga o servidor e permite que o telemóvel consiga comunicar com a base de dados pela rede Wi-Fi!
- `php artisan migrate` : Atualiza a base de dados (cria todas as tabelas e relações necessárias).
- `php artisan tinker` : Uma consola interativa de testes onde podes pesquisar na base de dados diretamente através de código (ex: `App\Models\Boia::all()`).

---

## 3. 📡 WebSockets (Gateway de Tempo Real)
**Localização:** `/websockets`

Este é o nosso Microserviço focado em velocidade de transmissão (*Broadcaster*). Ele não guarda dados, apenas distribui as mensagens da API para os clientes em frações de segundo (Pub/Sub Pattern).

### 📦 Bibliotecas e Tecnologias Principais:
- **Node.js:** O ambiente que permite correr Javascript como um servidor.
- **Express:** Um mini-servidor web que nós usamos apenas para abrir o *endpoint* `/api/broadcast` que recebe a informação (Webhook) do Laravel.
- **Socket.io:** A tecnologia "Server-Side" de WebSockets que mantém as ligações abertas e persistentes (TCP) com os telemóveis e computadores dos clientes.
- **Cors:** Regras de segurança para permitir que o Front-End (que está noutra porta ou noutro IP) consiga falar com o Node sem ser bloqueado pelos navegadores.
- **Dotenv:** Carrega variáveis protegidas (tokens internos) do ficheiro `.env`.

### 🚀 Comandos Importantes:
*Dica: Abre a linha de comandos na pasta `websockets`.*
- `npm install` : Instala o socket.io e o express.
- `node server.js` ou `npm start` : Comando oficial de produção. Liga o servidor de forma direta e limpa. Por defeito abre na porta 3001 para a rede (`0.0.0.0`).
- `npm run dev` : Inicia o NodeJS em modo "Vigia" (Watch). Se alterares o código do `server.js` e guardares, ele reinicia o servidor sozinho.

---

## 🔗 Fluxo da Arquitetura em Ação:
Para entenderes como estas 3 peças "dançam" juntas:
1. **O Hardware (ESP32)** faz **POST** (telemetria) -> `API (Laravel)`.
2. A **API** avalia os dados, verifica limites, gera alertas, guarda na Base de Dados e, por fim, dispara um **POST HTTP silencioso** -> `WebSockets (Node.js)`.
3. O **WebSockets** recebe esse sinal e emite um evento instantâneo via protocolo `WS` -> `Frontend (Browser/Telemóvel)`.
4. O **Frontend** recebe o evento sem precisares de fazer refresh à página, atualizando os cartões e gráficos dinamicamente!
