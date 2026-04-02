<?php

namespace App\Console\Commands;

use App\Jobs\Sepa\FinalizeSepaImportJob;
use App\Jobs\Sepa\PrepareSepaImportJob;
use App\Jobs\Sepa\ProcessSepaImportSliceJob;
use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Console\Command;

class SepaSyncCommand extends Command
{
    protected $signature = 'sepa:sync
        {--day= : Día en español (lunes..domingo) para forzar origen}
        {--date= : Fecha de referencia para logging/reproceso}
        {--sync : Ejecuta el próximo paso en modo síncrono sin cola}';

    protected $description = 'Inicia o avanza el pipeline incremental de importación SEPA.';

    public function handle(SepaSourceResolver $sourceResolver, SepaImportService $importService): int
    {
        $day = $this->resolveDay($sourceResolver);
        if ($day === null) {
            return self::INVALID;
        }

        $date = $this->normalizeRequestedDate();
        $run = $this->findRunningRun($day, $date) ?? $importService->startRun($day, $date);

        if ($this->option('sync')) {
            $run = $importService->advanceRun($run);
            $this->info("SEPA sync avanzado en modo síncrono. Run #{$run->id} -> {$run->stage} ({$run->status})");

            return self::SUCCESS;
        }

        $jobClass = $this->dispatchNextJob($run);
        if ($jobClass === null) {
            $this->info("La corrida SEPA #{$run->id} ya no tiene pasos pendientes ({$run->stage}/{$run->status}).");

            return self::SUCCESS;
        }

        $this->info("SEPA sync encolado. Run #{$run->id} -> {$run->stage} via {$jobClass}");

        return self::SUCCESS;
    }

    private function findRunningRun(string $day, ?string $requestedDate): ?SepaImportRun
    {
        return SepaImportRun::query()
            ->where('day', $day)
            ->when(
                $requestedDate !== null,
                fn ($query) => $query->where('requested_date', $requestedDate),
                fn ($query) => $query->whereNull('requested_date')
            )
            ->where('status', 'running')
            ->latest('id')
            ->first();
    }

    private function dispatchNextJob(SepaImportRun $run): ?string
    {
        return match ($run->stage) {
            SepaImportService::STAGE_PENDING_DOWNLOAD,
            SepaImportService::STAGE_PENDING_DISCOVERY => tap(PrepareSepaImportJob::class, fn () => PrepareSepaImportJob::dispatch($run->id)),
            SepaImportService::STAGE_PENDING_PROCESSING => tap(ProcessSepaImportSliceJob::class, fn () => ProcessSepaImportSliceJob::dispatch($run->id)),
            SepaImportService::STAGE_PENDING_FINALIZE => tap(FinalizeSepaImportJob::class, fn () => FinalizeSepaImportJob::dispatch($run->id)),
            default => null,
        };
    }

    private function normalizeRequestedDate(): ?string
    {
        $date = $this->option('date');

        return is_string($date) && trim($date) !== '' ? trim($date) : null;
    }

    private function resolveDay(SepaSourceResolver $sourceResolver): ?string
    {
        $day = $this->option('day');
        $day = is_string($day) && trim($day) !== '' ? mb_strtolower(trim($day)) : $this->currentSpanishDay();

        if (!in_array($day, $sourceResolver->supportedDays(), true)) {
            $supported = implode(', ', $sourceResolver->supportedDays());
            $this->error("Día inválido [{$day}]. Valores permitidos: {$supported}");

            return null;
        }

        return $day;
    }

    private function currentSpanishDay(): string
    {
        return match (strtolower(now()->locale('es')->isoFormat('dddd'))) {
            'lunes' => 'lunes',
            'martes' => 'martes',
            'miércoles', 'miercoles' => 'miercoles',
            'jueves' => 'jueves',
            'viernes' => 'viernes',
            'sábado', 'sabado' => 'sabado',
            'domingo' => 'domingo',
            default => 'lunes',
        };
    }
}
