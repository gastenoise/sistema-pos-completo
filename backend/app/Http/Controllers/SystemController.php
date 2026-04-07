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
            // --sync para que se ejecute en el momento y no vaya a la cola.
            // requested-date sólo deja traza de auditoría y no altera el dataset fuente importado.
            $requestedDateInput = $request->input('requested_date');
            $requestedDate = is_string($requestedDateInput) && trim($requestedDateInput) !== ''
                ? trim($requestedDateInput)
                : null;

            $arguments = ['--sync' => true];
            if ($requestedDate !== null) {
                $arguments['--requested-date'] = $requestedDate;
            }

            Artisan::call('sepa:sync', $arguments);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Sincronización SEPA ejecutada. requested_date se registra solo para auditoría y no cambia el dataset importado.',
                'requested_date' => $requestedDate,
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
