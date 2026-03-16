<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class SystemController extends Controller
{
    /**
     * Ejecuta manualmente el scheduler de Laravel.
     * Útil para entornos como Render Free donde no hay Cron Jobs nativos.
     */
    public function runScheduler(Request $request)
    {
        $token = config('services.system.cron_token');

        if (!$token || $request->header('X-Cron-Token') !== $token) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.'
            ], 401);
        }

        try {
            Artisan::call('schedule:run');
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Scheduler ejecutado.',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            Log::error('Error ejecutando el scheduler manual: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al ejecutar el scheduler.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ejecuta manualmente la sincronización SEPA.
     */
    public function runSepaSync(Request $request)
    {
        $token = config('services.system.cron_token');

        if (!$token || $request->header('X-Cron-Token') !== $token) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.'
            ], 401);
        }

        try {
            // --sync para que se ejecute en el momento y no vaya a la cola
            Artisan::call('sepa:sync', ['--sync' => true]);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Sincronización SEPA ejecutada.',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            Log::error('Error ejecutando SEPA sync manual: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al ejecutar SEPA sync.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
