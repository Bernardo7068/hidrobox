<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = 'admin@empresa.pt';
$pass = 'admin123';

$user = User::where('email', $email)->first();

if (!$user) {
    echo "Utilizador não encontrado!\n";
    exit;
}

if (Hash::check($pass, $user->password)) {
    echo "Password correta!\n";
    echo "Role: " . $user->role . "\n";
    echo "Empresa ID: " . ($user->empresa_id ?? 'NULL') . "\n";
} else {
    echo "Password INCORRETA!\n";
}
