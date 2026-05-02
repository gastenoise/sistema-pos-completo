<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class ResetUserPasswordCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:reset-password {--email= : Email del usuario} {--password= : Nueva contraseña}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cambia la contraseña de un usuario por su email. Útil para resetear contraseñas manualmente.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email');
        $password = $this->option('password');

        // Si no se proporcionan los argumentos, solicitarlos interactivamente
        if (!$email) {
            $email = $this->ask('Email del usuario');
        }

        if (!$password) {
            $password = $this->secret('Nueva contraseña');
        }

        if (empty($email)) {
            $this->error('El email es requerido.');
            return self::FAILURE;
        }

        if (empty($password)) {
            $this->error('La contraseña es requerida.');
            return self::FAILURE;
        }

        // Buscar el usuario por email
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("No se encontró ningún usuario con el email: {$email}");
            return self::FAILURE;
        }

        // Actualizar la contraseña (se hashea automáticamente gracias al cast 'hashed')
        $user->password = $password;
        $user->save();

        $this->info("Contraseña actualizada exitosamente para el usuario: {$user->name} ({$user->email})");
        
        return self::SUCCESS;
    }
}
