# Project: HidroBox

## Project Overview
HidroBox is an integrated water quality monitoring system. It features remote sensor units (ESP32-based "boias"), a central Laravel API for data collection and management, and a React-based web dashboard for real-time visualization and alert management.

### Architecture
- **Hardware (esp32hidrobox/):** ESP32 units that read sensor data (Oxygen, pH, Temperature, etc.) and transmit them via HTTP POST to the API.
- **Backend (api/):** A Laravel 13 application that stores readings, manages device configurations (zones, sensor limits), and provides an API for the frontend.
- **Frontend (frontend/):** A modern React 19 application built with Vite and Tailwind CSS, offering a dashboard for monitoring buoy statuses and alerts.

## Tech Stack
- **Backend:** PHP 8.3, Laravel 13, SQLite/MySQL, Sanctum (Auth), Vite (Asset Bundling).
- **Frontend:** JavaScript/JSX, React 19, Tailwind CSS 3, Axios, Vite.
- **Hardware:** C++/Arduino (ESP32), WiFi, HTTPClient, ArduinoJson, Adafruit SSD1306 (OLED).

## Building and Running

### Backend (API)
1. Navigate to the `api/` directory.
2. Install PHP dependencies: `composer install`.
3. Install JS dependencies: `npm install`.
4. Configure environment: Copy `.env.example` to `.env` and set `BOIA_API_KEY`.
5. Generate app key: `php artisan key:generate`.
6. Run migrations: `php artisan migrate`.
7. Start the development server: `npm run dev` (This uses `concurrently` to run the Laravel server and Vite).

### Frontend
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`.
3. Start the development server: `npm run dev`.

### Hardware (ESP32)
1. Open `esp32hidrobox/esp32hidrobox.ino` in Arduino IDE or PlatformIO.
2. Install required libraries: `ArduinoJson`, `Adafruit GFX`, `Adafruit SSD1306`.
3. Update `ssid`, `password`, and `serverName` (API endpoint) in the `.ino` file.
4. Flash to the ESP32 board.

## Development Conventions
- **API Security:** Hardware communication is protected via the `LoraGateway` middleware using the `X-HydroBox-Token` header.
- **Code Style:** 
    - Laravel: PSR-12 / Laravel Pint.
    - Frontend: ESLint with React hooks/refresh plugins.
- **Environment:** Use `.env` files for configuration. Do not commit sensitive keys.
