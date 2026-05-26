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
            // Agora o admin pode ser um ID existente ou novos dados
            'admin_id'       => 'nullable|exists:users,id',
            'admin_nome'     => 'required_without:admin_id|string',
            'admin_email'    => 'required_without:admin_id|email|unique:users,email',
            'admin_password' => 'required_without:admin_id|min:6',
        ]);

        return \DB::transaction(function () use ($validated, $request) {
            $empresa = Empresa::create([
                'nome' => $validated['nome'],
                'nif'  => $validated['nif'],
            ]);

            if ($request->filled('admin_id')) {
                // Associar user existente
                $user = \App\Models\User::find($validated['admin_id']);
                $user->update([
                    'empresa_id' => $empresa->id,
                    'role'       => 'admin_empresa'
                ]);
            } else {
                // Criar novo user
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
                'mensagem' => 'Empresa e Administrador configurados com sucesso!',
                'empresa' => $empresa,
                'admin'   => $user
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
}
