<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LoraGatewayToken
{
    public function handle(Request $request, Closure $next): Response
    {
        // Vai buscar o token enviado no cabeçalho customizado pelo ESP32
        $tokenEnviado = $request->header('X-HydroBox-Token');
        $tokenCorreto = config('app.boia_api_key') ?? env('BOIA_API_KEY');

        // Se o token não existir ou não coincidir, rejeita imediatamente com 401 Unauthorized
        if (!$tokenEnviado || $tokenEnviado !== $tokenCorreto) {
            return response()->json([
                'sucesso' => false,
                'erro' => 'Não Autorizado',
                'mensagem' => 'Chave de API inválida ou ausente no cabeçalho X-HydroBox-Token.'
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}