<?php

namespace Tests\Feature;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Support\Facades\File;
use Mockery;
use Tests\TestCase;

class SepaSyncByDepthTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        File::cleanDirectory(storage_path('app/sepa/tmp'));
    }

    public function test_it_asks_for_depth_when_option_is_provided(): void
    {
        $resolver = Mockery::mock(SepaSourceResolver::class);
        $resolver->shouldReceive('supportedDays')->andReturn(['lunes']);
        $this->app->instance(SepaSourceResolver::class, $resolver);

        config(['sepa.day_urls.lunes' => 'https://example.com/lunes.zip']);

        $importService = Mockery::mock(SepaImportService::class);
        $run = new SepaImportRun();
        $run->forceFill(['id' => 123, 'status' => 'success']);

        // We expect import to be called. The 4th argument is the depthResolver closure.
        $importService->shouldReceive('import')
            ->once()
            ->with('lunes', null, Mockery::any(), Mockery::on(fn($closure) => is_callable($closure)))
            ->andReturnUsing(function ($day, $date, $onProgress, $depthResolver) use ($run) {
                // Simulate the service calling the depth resolver
                $tempFile = tempnam(sys_get_temp_dir(), 'test_zip');
                file_put_contents($tempFile, 'dummy content');
                $depthResolver([$tempFile]);
                unlink($tempFile);
                return $run;
            });

        $this->app->instance(SepaImportService::class, $importService);

        $this->artisan('sepa:sync', [
            'day' => 'lunes',
            '--sync' => true,
            '--by-depth' => true,
        ])
            ->expectsOutput('Se encontraron 1 archivos .zip internos:')
            ->expectsQuestion('¿Qué profundidad de archivos usar? (1-1)', '1')
            ->expectsOutput('SEPA sync finalizado. Run #123 (success)')
            ->assertExitCode(0);
    }
}
