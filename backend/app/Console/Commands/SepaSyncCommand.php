<?php

namespace App\Console\Commands;

use App\Jobs\Sepa\ProcessSepaSyncJob;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Console\Command;

class SepaSyncCommand extends Command
{
    protected $signature = 'sepa:sync
        {day? : Día en español (lunes..domingo). Si no se envía, usa el día actual}
        {--day= : [DEPRECADO] Día en español (lunes..domingo) para forzar origen}
        {--requested-date= : Fecha solicitada (auditoría); no cambia el dataset importado}
        {--source-file= : Archivo local para usar como origen en lugar de URL}
        {--sync : Ejecuta en modo síncrono sin cola}';

    protected $description = 'Sincroniza productos SEPA desde ZIP diario.';

    public function handle(SepaSourceResolver $sourceResolver, SepaImportService $importService): int
    {
        $day = $this->resolveDay($sourceResolver);
        if ($day === null) {
            return self::INVALID;
        }

        $requestedDate = $this->option('requested-date');
        $requestedDate = is_string($requestedDate) ? $requestedDate : null;

        if (!$this->usesSourceFile() && !$this->validateConfiguredUrl($sourceResolver, $day)) {
            return self::INVALID;
        }

        if ($this->option('sync')) {
            $progressBar = null;

            $onProgress = function (string $stage, array $data) use (&$progressBar) {
                switch ($stage) {
                    case 'download_start':
                        $this->info("Descargando desde: {$data['url']}");
                        break;

                    case 'download_progress':
                        if ($data['total'] > 0) {
                            if ($progressBar === null) {
                                $progressBar = $this->output->createProgressBar($data['total']);
                                $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% -- %message%');
                                $progressBar->setMessage('Descargando...');
                                $progressBar->start();
                            }
                            $progressBar->setProgress($data['current']);
                        } else {
                            $this->output->write('.');
                        }
                        break;

                    case 'extract_start':
                        if ($progressBar) {
                            $progressBar->finish();
                            $this->output->newLine();
                            $progressBar = null;
                        }
                        $this->comment("Extraer: {$data['file']}");
                        break;

                    case 'discovery_start':
                        $this->comment('Buscando archivos para importar...');
                        break;

                    case 'parse_start':
                        if ($progressBar) {
                            $progressBar->finish();
                            $this->output->newLine();
                            $progressBar = null;
                        }
                        $msg = isset($data['source'])
                            ? "Procesando: {$data['file']} (desde {$data['source']})"
                            : "Procesando: {$data['file']}";
                        $this->info($msg);
                        break;

                    case 'parse_progress':
                        if ($progressBar === null) {
                            $progressBar = $this->output->createProgressBar();
                            $progressBar->setFormat(' %current% filas -- %message%');
                            $progressBar->setMessage('Importando...');
                            $progressBar->start();
                        }
                        $progressBar->setProgress($data['valid']);
                        $progressBar->setMessage("Ins: {$data['inserted']} | Upd: {$data['updated']} | Err: {$data['invalid']}");
                        break;
                }
            };

            $run = $importService->import($day, $requestedDate, $onProgress);

            if ($progressBar) {
                $progressBar->finish();
                $this->output->newLine();
            }

            $this->info("SEPA sync finalizado. Run #{$run->id} ({$run->status})");

            return self::SUCCESS;
        }

        ProcessSepaSyncJob::dispatch($day, $requestedDate);
        $this->info("SEPA sync encolado para [{$day}]");

        return self::SUCCESS;
    }

    private function usesSourceFile(): bool
    {
        $sourceFile = $this->option('source-file');

        return is_string($sourceFile) && trim($sourceFile) !== '';
    }

    private function validateConfiguredUrl(SepaSourceResolver $sourceResolver, string $day): bool
    {
        $url = config('sepa.day_urls.'.$day);
        if (!is_string($url) || trim($url) === '') {
            if ($day === 'lunes') {
                $this->error('Configurá `SEPA_URL_LUNES` en .env');
            } else {
                $envKey = $this->resolveDayEnvKey($day);
                $this->error("Configurá `{$envKey}` en .env");
            }

            return false;
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            if ($day === 'lunes') {
                $this->error('La URL configurada para lunes no es válida');
            } else {
                $this->error("La URL configurada para {$day} no es válida");
            }

            return false;
        }

        return in_array($day, $sourceResolver->supportedDays(), true);
    }

    private function resolveDayEnvKey(string $day): string
    {
        return match ($day) {
            'miercoles' => 'SEPA_URL_MIERCOLES',
            default => 'SEPA_URL_'.mb_strtoupper($day),
        };
    }

    private function resolveDay(SepaSourceResolver $sourceResolver): ?string
    {
        $argumentDay = $this->argument('day');
        if (is_string($argumentDay) && trim($argumentDay) !== '') {
            $day = mb_strtolower(trim($argumentDay));
        } else {
            $optionDay = $this->option('day');
            $day = is_string($optionDay) && trim($optionDay) !== ''
                ? mb_strtolower(trim($optionDay))
                : $this->currentSpanishDay();
        }

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
