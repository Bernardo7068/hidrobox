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
            'mac' => 'required|string', // Retirado o 'exists' para permitir auto-discovery
            'gateway' => 'nullable|string', // MAC do Gateway (opcional)
            'bateria_pct' => 'nullable|integer|between:0,100', // Bateria opcional
            'rssi' => 'nullable|integer', // Força do sinal LoRa
            'leituras' => 'required|array|min:1', // Tem de enviar pelo menos 1 leitura
            'leituras.*.tipo_sensor_id' => 'required|integer', // Permite auto-discovery de novos IDs
            'leituras.*.valor' => 'required|numeric', // O valor tem de ser um número válido (float/int)
        ];
    }

    public function messages(): array
    {
        return [
            'mac.exists' => 'A boia com este MAC não está registada no sistema.',
            'leituras.*.tipo_sensor_id.exists' => 'Um dos tipos de sensor enviados é inválido.',
            'leituras.*.valor.numeric' => 'O valor do sensor deve ser numérico.',
        ];
    }
}
