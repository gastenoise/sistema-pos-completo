<?php

namespace Tests\Feature\Console\Commands;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Mockery;
use Tests\TestCase;

class SepaSyncCommandProgressTest extends TestCase
{
    public function test_sepa_sync_command_reports_progress_in_sync_mode()
    {
        $mockImportService = Mockery::mock(SepaImportService::class);
        $this->app->instance(SepaImportService::class, $mockImportService);

        $mockSourceResolver = Mockery::mock(SepaSourceResolver::class);
        $this->app->instance(SepaSourceResolver::class, $mockSourceResolver);

        $mockSourceResolver->shouldReceive('supportedDays')->andReturn(['lunes']);

        config(['sepa.day_urls.lunes' => 'http://example.com/test.zip']);

        $run = new SepaImportRun();
        $run->forceFill(['id' => 123, 'status' => 'success']);

        $mockImportService->shouldReceive('import')
            ->once()
            ->with('lunes', null, Mockery::type('\Closure'))
            ->andReturnUsing(function ($day, $requestedDate, $onProgress) use ($run) {
                // Simulate progress events
                $onProgress('download_start', ['url' => 'http://example.com/test.zip']);
                $onProgress('download_progress', ['total' => 100, 'current' => 50]);
                $onProgress('download_progress', ['total' => 100, 'current' => 100]);
                $onProgress('extract_start', ['file' => 'test.zip']);
                $onProgress('discovery_start', []);
                $onProgress('parse_start', ['file' => 'productos.csv']);
                $onProgress('parse_progress', ['valid' => 10, 'invalid' => 0, 'inserted' => 10, 'updated' => 0]);

                return $run;
            });

        $this->artisan('sepa:sync lunes --sync')
            ->expectsOutputToContain('Descargando desde: http://example.com/test.zip')
            ->expectsOutputToContain('Extraer: test.zip')
            ->expectsOutputToContain('Buscando archivos para importar...')
            ->expectsOutputToContain('Procesando: productos.csv')
            ->expectsOutputToContain('SEPA sync finalizado. Run #123 (success)')
            ->assertExitCode(0);
    }

    public function test_sepa_sync_command_reports_progress_with_unknown_download_size()
    {
        $mockImportService = Mockery::mock(SepaImportService::class);
        $this->app->instance(SepaImportService::class, $mockImportService);

        $mockSourceResolver = Mockery::mock(SepaSourceResolver::class);
        $this->app->instance(SepaSourceResolver::class, $mockSourceResolver);

        $mockSourceResolver->shouldReceive('supportedDays')->andReturn(['lunes']);

        config(['sepa.day_urls.lunes' => 'http://example.com/test.zip']);

        $run = new SepaImportRun();
        $run->forceFill(['id' => 124, 'status' => 'success']);

        $mockImportService->shouldReceive('import')
            ->once()
            ->with('lunes', null, Mockery::type('\Closure'))
            ->andReturnUsing(function ($day, $requestedDate, $onProgress) use ($run) {
                $onProgress('download_start', ['url' => 'http://example.com/test.zip']);
                $onProgress('download_progress', ['total' => 0, 'current' => 500]);
                $onProgress('download_progress', ['total' => 0, 'current' => 1000]);
                $onProgress('extract_start', ['file' => 'test.zip']);

                return $run;
            });

        $this->artisan('sepa:sync lunes --sync')
            ->expectsOutputToContain('Descargando desde: http://example.com/test.zip')
            ->expectsOutputToContain('Extraer: test.zip')
            ->assertExitCode(0);
    }
}
