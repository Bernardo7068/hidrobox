<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BoiaController;
use App\Http\Controllers\LeituraController;
use App\Http\Controllers\AlertaController;


//Rotas de Autenticação Padrão

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');



//Rotas do Frontend (React) - Painel de Controlo

// 1. Zonas e Sensores (Para preencher os formulários)
Route::get('/zonas', [BoiaController::class, 'getZonas']);
Route::get('/tipos-sensor', [BoiaController::class, 'getTiposSensor']);

// 2. Gestão de Boias
Route::get('/boias', [BoiaController::class, 'index']);
Route::post('/boias', [BoiaController::class, 'store']); // Criar nova boia
Route::post('/boias/associar-sensor', [BoiaController::class, 'associarSensor']); // Associar e definir limites
Route::get('/boias/{id}', [BoiaController::class, 'show']);
Route::get('/boias/{id}/historico', [LeituraController::class, 'historico']);

// 3. Gestão de Alertas
Route::get('/alertas/ativos', [AlertaController::class, 'ativos']);
Route::put('/alertas/{id}/resolver', [AlertaController::class, 'resolver']);



//Rotas do Hardware (ESP32 Gateway)
// Receber leituras via POST com segurança (Middleware)
Route::post('/leituras', [LeituraController::class, 'store'])->middleware('auth.gateway');