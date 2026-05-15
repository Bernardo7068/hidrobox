<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeituraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // A autorização já é feita pelo Middleware
    }

    public function rules(): array
    {
        return [
            'boia_id' => 'required|integer|exists:boias,id', // Garante que a boia existe na BD
            'leituras' => 'required|array|min:1', // Tem de enviar pelo menos 1 leitura
            'leituras.*.tipo_sensor_id' => 'required|integer|exists:tipos_sensor,id', // O sensor tem de existir
            'leituras.*.valor' => 'required|numeric', // O valor tem de ser um número válido (float/int)
        ];
    }

    public function messages(): array
    {
        return [
            'boia_id.exists' => 'A boia especificada não está registada no sistema.',
            'leituras.*.tipo_sensor_id.exists' => 'Um dos tipos de sensor enviados é inválido.',
            'leituras.*.valor.numeric' => 'O valor do sensor deve ser numérico.',
        ];
    }
}
