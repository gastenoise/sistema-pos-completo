<?php

namespace App\Console\Commands;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Console\Command;

class SepaAdvanceCommand extends Command
{
    protected $signature = 'sepa:advance
        {--day= : Día en español (lunes..domingo) para acotar la corrida activa}
        {--date= : Fecha de referencia para acotar la corrida activa}';

    protected $description = 'Avanza exactamente una etapa de la corrida SEPA activa más reciente.';

    public function handle(SepaSourceResolver $sourceResolver, SepaImportService $importService): int
    {
        $day = $this->resolveOptionalDay($sourceResolver);
        if ($day === false) {
            return self::INVALID;
        }

        $date = $this->normalizeRequestedDate();
        $run = $this->findRunningRun($day, $date);

        if ($run === null) {
            $this->info('No hay corridas SEPA activas para avanzar.');

            return self::SUCCESS;
        }

        $previousStage = $run->stage;
        $run = $importService->advanceRun($run);

        $this->info("SEPA advance ejecutado. Run #{$run->id} {$previousStage} -> {$run->stage} ({$run->status})");

        return self::SUCCESS;
    }

    private function findRunningRun(?string $day, ?string $requestedDate): ?SepaImportRun
    {
        return SepaImportRun::query()
            ->when($day !== null, fn ($query) => $query->where('day', $day))
            ->when(
                $requestedDate !== null,
                fn ($query) => $query->where('requested_date', $requestedDate)
            )
            ->where('status', 'running')
            ->latest('id')
            ->first();
    }

    private function normalizeRequestedDate(): ?string
    {
        $date = $this->option('date');

        return is_string($date) && trim($date) !== '' ? trim($date) : null;
    }

    private function resolveOptionalDay(SepaSourceResolver $sourceResolver): string|bool|null
    {
        $day = $this->option('day');
        if (!is_string($day) || trim($day) === '') {
            return null;
        }

        $day = mb_strtolower(trim($day));
        if (!in_array($day, $sourceResolver->supportedDays(), true)) {
            $supported = implode(', ', $sourceResolver->supportedDays());
            $this->error("Día inválido [{$day}]. Valores permitidos: {$supported}");

            return false;
        }

        return $day;
    }
}
