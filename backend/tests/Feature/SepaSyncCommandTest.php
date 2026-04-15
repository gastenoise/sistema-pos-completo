<?php

namespace Tests\Feature;

use App\Jobs\Sepa\ProcessSepaSyncJob;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class SepaSyncCommandTest extends TestCase
{
    public function test_it_accepts_requested_date_and_passes_it_to_import_service_in_sync_mode(): void
    {
        $resolver = Mockery::mock(SepaSourceResolver::class);
        $resolver->shouldReceive('supportedDays')->andReturn(['lunes']);
        $this->app->instance(SepaSourceResolver::class, $resolver);

        config(['sepa.day_urls.lunes' => 'https://example.com/lunes.zip']);

        $importService = Mockery::mock(SepaImportService::class);
        $importService->shouldReceive('import')
            ->once()
            ->with('lunes', '2026-04-07')
            ->andReturn((object) ['id' => 99, 'status' => 'success']);
        $this->app->instance(SepaImportService::class, $importService);

        $this->artisan('sepa:sync', [
            '--sync' => true,
            '--day' => 'lunes',
            '--requested-date' => '2026-04-07',
        ])
            ->expectsOutput('SEPA sync finalizado. Run #99 (success)')
            ->assertExitCode(0);
    }

    public function test_it_dispatches_job_with_requested_date_when_running_async(): void
    {
        $resolver = Mockery::mock(SepaSourceResolver::class);
        $resolver->shouldReceive('supportedDays')->andReturn(['lunes']);
        $this->app->instance(SepaSourceResolver::class, $resolver);

        config(['sepa.day_urls.lunes' => 'https://example.com/lunes.zip']);

        Queue::fake();

        $this->artisan('sepa:sync', [
            '--day' => 'lunes',
            '--requested-date' => '2026-04-07',
        ])->assertExitCode(0);

        Queue::assertPushed(ProcessSepaSyncJob::class, function (ProcessSepaSyncJob $job): bool {
            return $job->day === 'lunes' && $job->date === '2026-04-07';
        });
    }
}
