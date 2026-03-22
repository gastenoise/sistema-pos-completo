<?php

namespace Tests\Feature;

use App\Jobs\Sepa\PrepareSepaImportJob;
use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\InteractsWithSepaImportTestData;
use Tests\TestCase;

class SepaIncrementalResumeTest extends TestCase
{
    use InteractsWithSepaImportTestData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configureSepaDayUrls();
        $this->createSepaImportTables();
        $this->createSepaItemsTable();
        $this->clearSepaFilesystem();
        $this->fakeSepaDownload($this->sampleArchives());
    }

    protected function tearDown(): void
    {
        $this->clearSepaFilesystem();

        parent::tearDown();
    }

    public function test_sync_command_bootstraps_run_without_processing_everything_by_default(): void
    {
        Queue::fake();

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19'])
            ->assertSuccessful();

        $run = SepaImportRun::query()->firstOrFail();

        $this->assertSame(SepaImportService::STAGE_SCHEDULED, $run->stage);
        $this->assertSame('running', $run->status);
        Queue::assertPushed(PrepareSepaImportJob::class, 1);
    }

    public function test_sync_command_can_run_full_pipeline_in_explicit_diagnostic_mode(): void
    {
        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = SepaImportRun::query()->firstOrFail();
        $this->assertSame(SepaImportService::STAGE_SUCCESS, $run->stage);
        $this->assertSame('success', $run->status);
    }

    public function test_advance_command_processes_one_stage_at_a_time(): void
    {
        Queue::fake();

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19'])
            ->assertSuccessful();
        Queue::assertPushed(PrepareSepaImportJob::class, 1);

        $run = SepaImportRun::query()->firstOrFail();

        // scheduled -> to downloading
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_DOWNLOADING_MAIN_ZIP, $run->stage);

        // downloading -> downloaded
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_MAIN_ZIP_DOWNLOADED, $run->stage);

        // downloaded -> to extracting
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_EXTRACTING_MAIN_ZIP, $run->stage);

        // extracting -> extracted
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_MAIN_ZIP_EXTRACTED, $run->stage);

        // extracted -> to discovering
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_DISCOVERING_INNER_ARCHIVES, $run->stage);

        // discovering -> ready for archive
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh(['files']);
        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);
        $this->assertCount(2, $run->files);

        // ready for archive -> to processing archive
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_PROCESSING_ARCHIVE, $run->stage);

        // processing archive -> processing stage
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_READY_FOR_CHUNK_PROCESSING, $run->stage);

        // ready for chunk -> processing chunk
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_PROCESSING_CHUNK, $run->stage);

        // processing chunk (since samples are small, 1 chunk finishes it) -> ready for archive (next file)
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh(['files']);
        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);
        $this->assertSame(['done', 'pending'], $run->files->pluck('status')->all());

        // Process second file
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful(); // to processing archive
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful(); // processing archive -> ready for chunk
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful(); // to processing chunk
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful(); // processing chunk -> ready for archive (none left)

        $run = $run->fresh(['files']);
        $this->assertSame(['done', 'done'], $run->files->pluck('status')->all());
        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);

        // No more files -> reconciling
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_RECONCILING_METRICS, $run->stage);

        // reconciling -> cleaning
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_CLEANING_ARTIFACTS, $run->stage);

        // cleaning -> success
        $this->artisan('sepa:advance', ['--day' => 'lunes', '--date' => '2026-03-19'])->assertSuccessful();
        $run = $run->fresh();

        $this->assertSame('success', $run->status);
        $this->assertSame(SepaImportService::STAGE_SUCCESS, $run->stage);
        $this->assertSame(3, $run->valid_rows);
        $this->assertSame(3, $run->inserted_rows);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$run->id));
    }
}
