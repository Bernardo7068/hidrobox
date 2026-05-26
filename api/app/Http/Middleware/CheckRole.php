<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // Se o utilizador não estiver autenticado ou não tiver o papel necessário
        if (!$user || !in_array($user->role, $roles)) {
            return response()->json([
                'sucesso' => false,
                'mensagem' => 'Acesso Negado: Não tem permissões para realizar esta ação.'
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
