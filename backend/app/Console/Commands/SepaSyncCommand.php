<?php

namespace App\Console\Commands;

use App\Jobs\Sepa\ProcessSepaSyncJob;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Console\Command;

class SepaSyncCommand extends Command
{
    protected $signature = 'sepa:sync
        {--day= : Día en español (lunes..domingo) para forzar origen}
        {--date= : Fecha de referencia para logging/reproceso}
        {--sync : Ejecuta en modo síncrono sin cola}';

    protected $description = 'Sincroniza productos SEPA desde ZIP diario.';

    public function handle(SepaSourceResolver $sourceResolver, SepaImportService $importService): int
    {
        $day = $this->resolveDay($sourceResolver);
        if ($day === null) {
            return self::INVALID;
        }

        $date = $this->option('date');
        $date = is_string($date) ? $date : null;

        if ($this->option('sync')) {
            $run = $importService->import($day, $date);
            $this->info("SEPA sync finalizado. Run #{$run->id} ({$run->status})");

            return self::SUCCESS;
        }

        ProcessSepaSyncJob::dispatch($day, $date);
        $this->info("SEPA sync encolado para [{$day}]");

        return self::SUCCESS;
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
