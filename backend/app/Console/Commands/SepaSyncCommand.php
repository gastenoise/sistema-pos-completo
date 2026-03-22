<?php

namespace App\Console\Commands;

use App\Jobs\Sepa\PrepareSepaImportJob;
use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Console\Command;

class SepaSyncCommand extends Command
{
    protected $signature = 'sepa:sync
        {--day= : Día en español (lunes..domingo) para forzar origen}
        {--date= : Fecha de referencia para logging/reproceso}
        {--sync : Ejecuta toda la corrida en modo diagnóstico, sin depender del scheduler}';

    protected $description = 'Inicia la corrida SEPA del día y dispara sólo la etapa de bootstrap/descarga.';

    public function handle(SepaSourceResolver $sourceResolver, SepaImportService $importService): int
    {
        $day = $this->resolveDay($sourceResolver);
        if ($day === null) {
            return self::INVALID;
        }

        $date = $this->normalizeRequestedDate();
        $run = $this->findRunningRun($day, $date);

        if ($run === null) {
            $run = $importService->startRun($day, $date);
            $this->info("Corrida SEPA iniciada. Run #{$run->id} -> {$run->stage} ({$run->status})");
        } else {
            $this->info("Reutilizando corrida SEPA activa. Run #{$run->id} -> {$run->stage} ({$run->status})");
        }

        if ($this->option('sync')) {
            while ($run->status === 'running' && $run->canAdvance()) {
                $run = $importService->advanceRun($run);
            }

            $this->info("SEPA sync completado en modo diagnóstico. Run #{$run->id} -> {$run->stage} ({$run->status})");

            return self::SUCCESS;
        }

        $jobClass = $this->dispatchBootstrapJob($run);
        if ($jobClass === null) {
            $this->info("La corrida SEPA #{$run->id} queda a la espera del scheduler de avance ({$run->stage}/{$run->status}).");

            return self::SUCCESS;
        }

        $this->info("Bootstrap SEPA encolado. Run #{$run->id} -> {$run->stage} via {$jobClass}");

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

    private function dispatchBootstrapJob(SepaImportRun $run): ?string
    {
        if (!in_array($run->stage, [
            SepaImportService::STAGE_SCHEDULED,
            SepaImportService::STAGE_DOWNLOADING_MAIN_ZIP,
            SepaImportService::STAGE_MAIN_ZIP_DOWNLOADED,
            SepaImportService::STAGE_EXTRACTING_MAIN_ZIP,
            SepaImportService::STAGE_MAIN_ZIP_EXTRACTED,
            SepaImportService::STAGE_DISCOVERING_INNER_ARCHIVES,
        ], true)) {
            return null;
        }

        PrepareSepaImportJob::dispatch($run->id);

        return PrepareSepaImportJob::class;
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
