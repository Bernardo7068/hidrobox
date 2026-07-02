<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BoiaController;
use App\Http\Controllers\LeituraController;
use App\Http\Controllers\AlertaController;
use App\Http\Middleware\LoraGateway;

use App\Http\Controllers\AuthController;

use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\UserController;

// 0. Autenticação e Utilizador
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // 0.1 Gestão Multi-Tenant (Apenas Admins)
    Route::get('/empresas', [EmpresaController::class, 'index'])->middleware('role:super_admin');
    Route::post('/empresas', [EmpresaController::class, 'store'])->middleware('role:super_admin');
    Route::put('/empresas/{id}', [EmpresaController::class, 'update'])->middleware('role:super_admin');
    Route::delete('/empresas/{id}', [EmpresaController::class, 'destroy'])->middleware('role:super_admin');
    
    Route::get('/users', [UserController::class, 'index'])->middleware('role:super_admin,admin_empresa');
    Route::post('/users', [UserController::class, 'store'])->middleware('role:super_admin,admin_empresa');
    Route::put('/users/{id}', [UserController::class, 'update'])->middleware('role:super_admin,admin_empresa');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('role:super_admin,admin_empresa');

    // 1. Zonas e Sensores (Protegidos)
    Route::get('/zonas', [BoiaController::class, 'getZonas']);
    Route::get('/tipos-sensor', [BoiaController::class, 'getTiposSensor']);

    // 2. Gestão de Boias (Protegidos)
    Route::get('/boias', [BoiaController::class, 'index']);
    Route::post('/boias', [BoiaController::class, 'store'])->middleware('role:super_admin,admin_empresa'); 
    Route::put('/boias/{id}', [BoiaController::class, 'update'])->middleware('role:super_admin,admin_empresa,tecnico_empresa'); 
    Route::post('/boias/{id}/manutencao', [BoiaController::class, 'registarManutencao'])->middleware('role:super_admin,admin_empresa,tecnico_empresa');
    Route::post('/boias/associar-sensor', [BoiaController::class, 'associarSensor'])->middleware('role:super_admin,admin_empresa,tecnico_empresa');
    Route::post('/boias/desassociar-sensor', [BoiaController::class, 'desassociarSensor'])->middleware('role:super_admin,admin_empresa');
    Route::post('/boias/{id}/ciclos-manutencao', [BoiaController::class, 'atualizarCiclos'])->middleware('role:super_admin,admin_empresa,tecnico_empresa');
    Route::delete('/boias/{id}', [BoiaController::class, 'destroy'])->middleware('role:super_admin,admin_empresa');
    Route::get('/boias/{id}', [BoiaController::class, 'show']);
    Route::get('/boias/{id}/historico', [LeituraController::class, 'historico']);

    // 2.1 Gestão de Gateways
    Route::get('/gateways', [BoiaController::class, 'getGateways']);
    Route::post('/gateways', [BoiaController::class, 'storeGateway'])->middleware('role:super_admin,admin_empresa');
    Route::put('/gateways/{id}', [BoiaController::class, 'updateGateway'])->middleware('role:super_admin,admin_empresa,tecnico_empresa');
    Route::delete('/gateways/{id}', [BoiaController::class, 'destroyGateway'])->middleware('role:super_admin,admin_empresa');

    // 2.2 Estatísticas e Relatórios
    Route::get('/estatisticas', [\App\Http\Controllers\EstatisticasController::class, 'getEstatisticas']);
    Route::get('/exportar-pdf', [\App\Http\Controllers\EstatisticasController::class, 'exportarPDF']);

    // 2.3 Tipos de Sensores (Gestão Global)
    Route::get('/tipos-sensor', [BoiaController::class, 'getTiposSensor']);
    Route::post('/tipos-sensor', [BoiaController::class, 'storeTipoSensor'])->middleware('role:super_admin');
    Route::put('/tipos-sensor/{id}', [BoiaController::class, 'updateTipoSensor'])->middleware('role:super_admin');
    Route::delete('/tipos-sensor/{id}', [BoiaController::class, 'destroyTipoSensor'])->middleware('role:super_admin');

    // 3. Gestão de Alertas (Protegidos)
    Route::get('/alertas/ativos', [AlertaController::class, 'ativos']);
    Route::put('/alertas/{id}/resolver', [AlertaController::class, 'resolver'])->middleware('role:super_admin,admin_empresa,tecnico_empresa');
    Route::get('/alertas', [AlertaController::class, 'index']);
});

// Rotas do Hardware (ESP32 Gateway)
// Receber leituras via POST com segurança (Middleware específico)
Route::post('/leituras', [LeituraController::class, 'store'])->middleware(LoraGateway::class);
