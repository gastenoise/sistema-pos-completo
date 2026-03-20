<?php

namespace Tests\Feature;

use App\Models\SepaImportRun;
use App\Services\Sepa\SepaImportService;
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

    public function test_sync_command_resumes_same_run_across_cron_executions(): void
    {
        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = SepaImportRun::query()->firstOrFail();
        $this->assertSame(SepaImportService::STAGE_DOWNLOADED, $run->stage);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = $run->fresh(['files']);
        $this->assertContains($run->stage, [SepaImportService::STAGE_READY_TO_PROCESS, SepaImportService::STAGE_PROCESSING]);
        $this->assertSame(0, $run->next_file_index);
        $this->assertCount(2, $run->files);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = $run->fresh(['files']);
        $this->assertContains($run->stage, [SepaImportService::STAGE_READY_TO_PROCESS, SepaImportService::STAGE_PROCESSING]);
        $this->assertSame(1, $run->next_file_index);
        $this->assertSame(['done', 'pending'], $run->files->pluck('status')->all());

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = $run->fresh(['files']);
        $this->assertSame(SepaImportService::STAGE_FINALIZING, $run->stage);
        $this->assertSame(2, $run->next_file_index);
        $this->assertSame(['done', 'done'], $run->files->pluck('status')->all());

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $run = $run->fresh();

        $this->assertSame('success', $run->status);
        $this->assertSame(SepaImportService::STAGE_SUCCESS, $run->stage);
        $this->assertSame(3, $run->valid_rows);
        $this->assertSame(3, $run->inserted_rows);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$run->id));
    }
}
