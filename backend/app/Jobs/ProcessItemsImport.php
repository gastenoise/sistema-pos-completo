<?php

namespace App\Jobs;

use App\Actions\Items\ImportItemsAction;
use App\Models\User;
use App\Notifications\ItemsImportCompleted;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProcessItemsImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 600; // 10 minutos para procesar muchos items
    public array $backoff = [30, 60, 120]; // Reintentos con espera

    public function __construct(
        private array $items,
        private int $businessId,
        private ?int $userId,
        private string $importId,
        private bool $syncBySku,
        private bool $syncByBarcode,
        private ?int $categoryId
    ) {}

    public function handle(ImportItemsAction $importItemsAction): void
    {
        try {
            // Calcular métricas estimadas primero
            $estimatedMetrics = $importItemsAction->estimateMetrics(
                $this->items,
                $this->businessId,
                $this->syncByBarcode,
                $this->syncBySku
            );

            // Guardar progreso inicial
            $this->updateProgress('processing', 0, $estimatedMetrics);

            // Procesar en chunks para reportar progreso
            $total = count($this->items);
            $chunkSize = 500;
            $processed = 0;
            $allResults = [
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'errors' => [],
            ];

            foreach (array_chunk($this->items, $chunkSize) as $chunk) {
                $result = $importItemsAction->execute(
                    $chunk,
                    $this->syncBySku,
                    $this->businessId,
                    $this->syncByBarcode,
                    $this->categoryId
                );

                $allResults['created'] += $result['created'] ?? 0;
                $allResults['updated'] += $result['updated'] ?? 0;
                $allResults['skipped'] += $result['skipped'] ?? 0;
                if (!empty($result['errors'])) {
                    $allResults['errors'] = array_merge($allResults['errors'], $result['errors']);
                }

                $processed += count($chunk);
                $progress = (int) (($processed / $total) * 100);
                
                $this->updateProgress('processing', $progress, null, $allResults);
            }

            // Marcar como completado
            $finalResult = [
                'success' => true,
                'created' => $allResults['created'],
                'updated' => $allResults['updated'],
                'skipped' => $allResults['skipped'],
                'errors' => $allResults['errors'],
                'total_processed' => $processed,
            ];

            $this->updateProgress('completed', 100, $estimatedMetrics, $finalResult);

            // Notificar al usuario si existe
            if ($this->userId) {
                $user = User::find($this->userId);
                $user?->notify(new ItemsImportCompleted($finalResult, $this->importId));
            }

        } catch (\Throwable $e) {
            Log::error('Import failed', [
                'import_id' => $this->importId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->updateProgress('failed', 0, null, ['error' => $e->getMessage()]);
            
            throw $e; // Re-lanzar para que el job falle y se reintente
        }
    }

    private function updateProgress(
        string $status,
        int $progress,
        ?array $estimatedMetrics = null,
        ?array $result = null
    ): void {
        $data = [
            'status' => $status,
            'progress' => $progress,
            'updated_at' => now()->toIso8601String(),
        ];

        if ($estimatedMetrics !== null) {
            $data['estimated_metrics'] = $estimatedMetrics;
        }

        if ($result !== null) {
            $data['result'] = $result;
        }

        Cache::put("items_import:{$this->importId}", $data, now()->addHours(24));
    }
}