<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function index()
    {
        // Apenas para Super Admin (Protegido por Middleware na rota)
        return response()->json(Empresa::with(['users', 'zonas.boias'])->withCount(['users', 'zonas'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|unique:empresas,nome',
            'nif'  => 'required|string|unique:empresas,nif',
            'email_contacto' => 'nullable|email|max:255',
            'telefone'       => 'nullable|string|max:20',
            'morada'         => 'nullable|string|max:500',
            // Agora o admin é opcional no momento da criação da empresa
            'admin_id'       => 'nullable|exists:users,id',
            'admin_nome'     => 'nullable|string',
            'admin_email'    => 'nullable|email|unique:users,email',
            'admin_password' => 'nullable|min:6',
        ]);

        return \DB::transaction(function () use ($validated, $request) {
            $empresa = Empresa::create([
                'nome' => $validated['nome'],
                'nif'  => $validated['nif'],
                'email_contacto' => $validated['email_contacto'] ?? null,
                'telefone'       => $validated['telefone'] ?? null,
                'morada'         => $validated['morada'] ?? null,
            ]);

            if ($request->filled('admin_id')) {
                // Associar user existente
                $user = \App\Models\User::find($validated['admin_id']);
                $user->update([
                    'empresa_id' => $empresa->id,
                    'role'       => 'admin_empresa'
                ]);
            } elseif ($request->filled('admin_nome') && $request->filled('admin_email')) {
                // Criar novo user se os dados forem fornecidos
                $user = \App\Models\User::create([
                    'name'       => $validated['admin_nome'],
                    'email'      => $validated['admin_email'],
                    'password'   => \Hash::make($validated['admin_password']),
                    'role'       => 'admin_empresa',
                    'empresa_id' => $empresa->id,
                ]);
            }

            return response()->json([
                'sucesso' => true,
                'mensagem' => 'Empresa configurada com sucesso!',
                'empresa' => $empresa,
            ], 201);
        });
    }

    public function destroy($id)
    {
        $empresa = Empresa::find($id);
        if (!$empresa) {
            return response()->json(['mensagem' => 'Empresa não encontrada'], 404);
        }

        $empresa->delete();
        return response()->json(['sucesso' => true, 'mensagem' => 'Empresa removida.']);
    }

    public function update(Request $request, $id)
    {
        $empresa = Empresa::find($id);
        if (!$empresa) {
            return response()->json(['mensagem' => 'Empresa não encontrada'], 404);
        }

        $validated = $request->validate([
            'nome' => 'sometimes|string|unique:empresas,nome,' . $id,
            'nif'  => 'sometimes|string|unique:empresas,nif,' . $id,
            'email_contacto' => 'nullable|email|max:255',
            'telefone'       => 'nullable|string|max:20',
            'morada'         => 'nullable|string|max:500',
        ]);

        $empresa->update($validated);

        return response()->json(['sucesso' => true, 'empresa' => $empresa]);
    }
}
