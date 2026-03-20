<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

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
     * Ejecuta manualmente la orquestación SEPA.
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
            [$command, $parameters, $message] = $this->resolveSepaAction($request);

            Artisan::call($command, $parameters);
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => $message,
                'output' => $output
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error ejecutando SEPA sync manual: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al ejecutar SEPA sync.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * @return array{0: string, 1: array<string, mixed>, 2: string}
     */
    private function resolveSepaAction(Request $request): array
    {
        $action = strtolower((string) $request->input('action', 'start'));

        return match ($action) {
            'start' => ['sepa:sync', [], 'Corrida SEPA iniciada.'],
            'advance' => ['sepa:advance', [], 'Corrida SEPA avanzada una etapa.'],
            'diagnostic' => ['sepa:sync', ['--sync' => true], 'Corrida SEPA ejecutada en modo diagnóstico.'],
            default => throw new InvalidArgumentException('Acción SEPA inválida. Use start, advance o diagnostic.'),
        };
    }
}
