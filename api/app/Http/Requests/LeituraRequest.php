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
            'mac' => 'required_without:gateway|string|nullable', // MAC da boia (pode ser null se for heartbeat do gateway)
            'gateway' => 'required_without:mac|string|nullable', // MAC do Gateway
            'bateria_pct' => 'nullable|integer|between:0,100', // Bateria opcional da boia
            'bateria_gateway' => 'nullable|numeric|between:0,100', // Bateria opcional do gateway
            'rssi' => 'nullable|integer', // Força do sinal LoRa
            'leituras' => 'required_with:mac|array', // Tem de enviar leituras se enviar MAC da boia
            'leituras.*.tipo_sensor_id' => 'required_with:leituras|integer',
            'leituras.*.valor' => 'required_with:leituras|numeric',
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
