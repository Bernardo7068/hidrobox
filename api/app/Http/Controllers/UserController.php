<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Super Admin vê todos
        if ($user->role === 'super_admin') {
            return response()->json(User::all());
        }

        // Admin Empresa vê apenas os da sua empresa
        return response()->json(User::where('empresa_id', $user->empresa_id)->get());
    }

    public function store(Request $request)
    {
        $admin = $request->user();

        $validated = $request->validate([
            'name'     => 'required|string',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required|in:admin_empresa,tecnico_empresa,leitor_empresa,super_admin',
        ]);

        if ($admin->role !== 'super_admin' && $validated['role'] === 'super_admin') {
            return response()->json(['mensagem' => 'Acesso negado para criar Super Admin'], 403);
        }

        // Super Admin pode criar em qualquer empresa (se passar empresa_id)
        // Admin Empresa só cria na sua
        $empresaId = ($admin->role === 'super_admin') 
            ? $request->input('empresa_id') 
            : $admin->empresa_id;

        $user = User::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'role'       => $validated['role'],
            'empresa_id' => $empresaId,
        ]);

        return response()->json(['sucesso' => true, 'user' => $user], 201);
    }

    public function update(Request $request, $id)
    {
        $admin = $request->user();
        $user = User::find($id);

        if (!$user) return response()->json(['mensagem' => 'Utilizador não encontrado'], 404);

        // Bloquear se não for super_admin e tentar editar alguém de outra empresa
        if ($admin->role !== 'super_admin' && $user->empresa_id !== $admin->empresa_id) {
            return response()->json(['mensagem' => 'Acesso negado'], 403);
        }

        $validated = $request->validate([
            'name'       => 'sometimes|string',
            'email'      => 'sometimes|email|unique:users,email,' . $id,
            'role'       => 'sometimes|in:admin_empresa,tecnico_empresa,leitor_empresa,super_admin',
            'empresa_id' => 'sometimes|nullable|exists:empresas,id',
        ]);

        $user->update($validated);

        // Notificar via WebSocket
        try {
            Http::withHeaders([
                'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
            ])->post('http://localhost:3001/api/broadcast', [
                'empresa_id' => $user->empresa_id ?? 'super_admin',
                'event'      => 'perfil-atualizado',
                'data'       => ['user_id' => $user->id, 'role' => $user->role]
            ]);
        } catch (\Exception $e) {
            // Ignorar falha do websocket
        }

        return response()->json(['sucesso' => true, 'user' => $user]);
    }

    public function destroy($id, Request $request)
    {
        $admin = $request->user();
        $user = User::find($id);

        if (!$user) return response()->json(['mensagem' => 'Utilizador não encontrado'], 404);

        // Bloquear se não for super_admin e tentar apagar alguém de outra empresa
        if ($admin->role !== 'super_admin' && $user->empresa_id !== $admin->empresa_id) {
            return response()->json(['mensagem' => 'Acesso negado'], 403);
        }

        $user->delete();

        // Notificar via WebSocket para forçar logout no cliente
        try {
            Http::withHeaders([
                'x-internal-token' => env('INTERNAL_API_SECRET', 'chave-secreta-interna-hidrobox')
            ])->post('http://localhost:3001/api/broadcast', [
                'empresa_id' => $user->empresa_id ?? 'super_admin',
                'event'      => 'perfil-atualizado',
                'data'       => ['user_id' => $user->id, 'role' => 'apagado']
            ]);
        } catch (\Exception $e) {
            // Ignorar
        }

        return response()->json(['sucesso' => true, 'mensagem' => 'Utilizador removido.']);
    }
}
