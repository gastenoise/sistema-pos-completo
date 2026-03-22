<?php

namespace Tests\Unit;

use App\Jobs\Sepa\ProcessSepaImportSliceJob;
use App\Models\SepaImportRun;
use App\Models\SepaItem;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use RuntimeException;
use Tests\Concerns\InteractsWithSepaImportTestData;
use Tests\TestCase;

class SepaImportServiceTest extends TestCase
{
    use InteractsWithSepaImportTestData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->configureSepaDayUrls();
        $this->createSepaImportTables();
        $this->createSepaItemsTable();
        $this->clearSepaFilesystem();
    }

    protected function tearDown(): void
    {
        $this->clearSepaFilesystem();

        parent::tearDown();
    }

    public function test_it_normalizes_presentation_unit_variants_in_build_record(): void
    {
        $service = $this->service();
        $headers = [
            'id_producto',
            'productos_descripcion',
            'productos_precio_lista',
            'productos_cantidad_presentacion',
            'productos_unidad_medida_presentacion',
            'productos_marca',
        ];

        $cases = [
            ['UNIDAD', 'un'],
            ['Unida.', 'un'],
            ['P.U.', 'un'],
            ['pu', 'un'],
            ['kg', 'kg'],
        ];

        foreach ($cases as [$input, $expected]) {
            $row = ['7791234567890', 'Producto Test', '100.00', '1', $input, 'ACME'];

            $record = $this->invokePrivate($service, 'buildRecord', [$headers, $row]);

            $this->assertIsArray($record);
            $this->assertSame($expected, $record['presentation_unit']);
        }
    }

    public function test_it_normalizes_brand_variants_in_build_record(): void
    {
        $service = $this->service();
        $headers = [
            'id_producto',
            'productos_descripcion',
            'productos_precio_lista',
            'productos_cantidad_presentacion',
            'productos_unidad_medida_presentacion',
            'productos_marca',
        ];

        $cases = [
            ['sin marca', null],
            ['Sin Marca', null],
            ['ACME', 'ACME'],
        ];

        foreach ($cases as [$input, $expected]) {
            $row = ['7791234567890', 'Producto Test', '100.00', '1', 'kg', $input];

            $record = $this->invokePrivate($service, 'buildRecord', [$headers, $row]);

            $this->assertIsArray($record);
            $this->assertSame($expected, $record['brand']);
        }
    }

    public function test_it_updates_existing_item_on_reimport_with_same_barcode_using_upsert(): void
    {
        $service = $this->service();

        SepaItem::query()->create([
            'name' => 'Producto Original',
            'barcode' => '7791234567890',
            'price' => 150,
            'presentation_quantity' => 1,
            'presentation_unit' => 'unidad',
            'brand' => 'sin marca',
            'list_price' => 150,
        ]);

        $batch = [[
            'name' => 'Producto Reimportado',
            'barcode' => '7791234567890',
            'price' => 200,
            'presentation_quantity' => 2,
            'presentation_unit' => 'un',
            'brand' => null,
            'list_price' => 210,
            'created_at' => now(),
            'updated_at' => now(),
        ]];

        $metrics = [
            'downloaded_files' => 0,
            'valid_rows' => 1,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
            'error_samples' => [],
        ];
        $fileMetrics = [
            'valid_rows' => 1,
            'invalid_rows' => 0,
            'inserted_rows' => 0,
            'updated_rows' => 0,
            'error_samples' => [],
        ];

        $this->invokePrivate($service, 'persistChunk', [$batch, &$metrics, &$fileMetrics]);

        $this->assertDatabaseHas('sepa_items', [
            'barcode' => '7791234567890',
            'name' => 'Producto Reimportado',
            'price' => 200.00,
            'presentation_quantity' => 2.00,
            'presentation_unit' => 'un',
            'brand' => null,
            'list_price' => 210.00,
        ]);

        $this->assertSame(0, $metrics['inserted_rows']);
        $this->assertSame(1, $metrics['updated_rows']);
        $this->assertSame(1, $fileMetrics['updated_rows']);
    }

    public function test_it_can_resume_a_run_downloaded_but_not_processed(): void
    {
        $this->fakeSepaDownload($this->sampleArchives());
        $service = $this->service();

        $run = $service->startRun('lunes', '2026-03-19');
        $run = $service->toDownloadingMainZip($run);
        $run = $service->downloadMainZipStage($run);

        $this->assertSame('running', $run->status);
        $this->assertSame(SepaImportService::STAGE_MAIN_ZIP_DOWNLOADED, $run->stage);
        $this->assertNotNull($run->main_zip_path);

        $run = $service->toExtractingMainZip($run);
        $run = $service->extractMainZipStage($run);
        $this->assertDirectoryExists($run->main_extract_dir);
        $this->assertDirectoryExists(storage_path('app/sepa/tmp/run_'.$run->id));

        $run = $service->toDiscoveringInnerArchives($run);
        $run = $service->discoverInnerArchives($run);
        $run = $run->fresh(['files']);

        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);
        $this->assertSame(2, $run->total_zip_files);
        $this->assertCount(2, $run->files);
        $this->assertSame(['pending', 'pending'], $run->files->pluck('status')->all());
        $this->assertTrue($run->canAdvance());
        $this->assertFalse($run->canFinalize());
    }

    public function test_it_can_continue_from_file_three_of_n(): void
    {
        $this->fakeSepaDownload([
            [['id_producto' => '7790000000001', 'productos_ean' => '7790000000001', 'productos_descripcion' => 'Producto Uno', 'productos_precio_lista' => '100.00', 'productos_precio_vta1' => '100.00', 'productos_cantidad_presentacion' => '1', 'productos_unidad_medida_presentacion' => 'UNIDAD', 'productos_marca' => 'Marca Uno']],
            [['id_producto' => '7790000000002', 'productos_ean' => '7790000000002', 'productos_descripcion' => 'Producto Dos', 'productos_precio_lista' => '200.00', 'productos_precio_vta1' => '200.00', 'productos_cantidad_presentacion' => '1', 'productos_unidad_medida_presentacion' => 'UNIDAD', 'productos_marca' => 'Marca Dos']],
            [['id_producto' => '7790000000003', 'productos_ean' => '7790000000003', 'productos_descripcion' => 'Producto Tres', 'productos_precio_lista' => '300.00', 'productos_precio_vta1' => '300.00', 'productos_cantidad_presentacion' => '1', 'productos_unidad_medida_presentacion' => 'UNIDAD', 'productos_marca' => 'Marca Tres']],
        ]);
        $service = $this->service();

        $run = $service->startRun('lunes', '2026-03-19');
        $run = $service->toDownloadingMainZip($run);
        $run = $service->downloadMainZipStage($run);
        $run = $service->toExtractingMainZip($run);
        $run = $service->extractMainZipStage($run);
        $run = $service->toDiscoveringInnerArchives($run);
        $run = $service->discoverInnerArchives($run);

        // Process first file
        $run = $service->toProcessingArchive($run);
        $run = $service->processingArchiveStage($run);
        $run = $service->toProcessingChunk($run);
        $run = $service->processingChunkStage($run); // finishes file 1

        // Process second file
        $run = $service->toProcessingArchive($run);
        $run = $service->processingArchiveStage($run);
        $run = $service->toProcessingChunk($run);
        $run = $service->processingChunkStage($run); // finishes file 2

        $run = $run->fresh(['files']);

        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);
        $this->assertSame(['done', 'done', 'pending'], $run->files->pluck('status')->all());
        $this->assertDatabaseCount('sepa_items', 2);

        $job = new ProcessSepaImportSliceJob($run->id);
        $job->handle($service); // goes to toProcessingArchive (next step for STAGE_READY_FOR_ARCHIVE_PROCESSING)

        $run = $run->fresh();
        $this->assertSame(SepaImportService::STAGE_PROCESSING_ARCHIVE, $run->stage);

        $run = $service->advanceRun($run); // to ready for chunk
        $run = $service->advanceRun($run); // to processing chunk
        $run = $service->advanceRun($run); // finishes file 3 -> ready for archive

        $run = $run->fresh(['files']);

        $this->assertSame(SepaImportService::STAGE_READY_FOR_ARCHIVE_PROCESSING, $run->stage);
        $this->assertSame(['done', 'done', 'done'], $run->files->pluck('status')->all());
        $this->assertSame(3, $run->valid_rows);
        $this->assertSame(3, SepaItem::query()->count());
        $this->assertSame(1, $run->file_metrics[2]['valid_rows']);
    }

    public function test_cleanup_happens_only_when_run_completes_or_fails_definitively(): void
    {
        $this->fakeSepaDownload($this->sampleArchives());
        $service = $this->service();

        $run = $service->startRun('lunes', '2026-03-19');
        $run = $service->toDownloadingMainZip($run);
        $run = $service->downloadMainZipStage($run);
        $run = $service->toExtractingMainZip($run);
        $run = $service->extractMainZipStage($run);
        $run = $service->toDiscoveringInnerArchives($run);
        $run = $service->discoverInnerArchives($run);

        $run = $service->toProcessingArchive($run);
        $run = $service->processingArchiveStage($run);

        $this->assertDirectoryExists(storage_path('app/sepa/tmp/run_'.$run->id));

        $run = $service->toProcessingChunk($run);
        $run = $service->processingChunkStage($run); // finishes file 1
        $this->assertDirectoryExists(storage_path('app/sepa/tmp/run_'.$run->id));

        // Finish all files
        $run = $service->toProcessingArchive($run);
        $run = $service->processingArchiveStage($run);
        $run = $service->toProcessingChunk($run);
        $run = $service->processingChunkStage($run); // finishes file 2

        // Finalizing
        $run = $service->toProcessingArchive($run); // to reconciling
        $run = $service->reconcileMetricsStage($run); // to cleaning
        $run = $service->cleaningArtifactsStage($run); // to success

        $this->assertSame(SepaImportService::STAGE_SUCCESS, $run->stage);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$run->id));

        config()->set('sepa.max_stage_attempts', 1);
        $resolver = $this->createMock(SepaSourceResolver::class);
        $resolver->method('resolveUrlForDay')->willReturn('http://example.com/sepa.zip');

        $failingService = new class($resolver) extends SepaImportService {
            protected function downloadMainZip(string $url, string $destinationPath): void
            {
                file_put_contents($destinationPath, 'broken');
                throw new RuntimeException('Simulated import failure');
            }
        };

        try {
            $run = $failingService->startRun('lunes');
            $failingService->toDownloadingMainZip($run);
            $failingService->downloadMainZipStage($run);
            $this->fail('The import should throw an exception.');
        } catch (RuntimeException $e) {
            $this->assertSame('Simulated import failure', $e->getMessage());
        }

        $failedRun = SepaImportRun::query()->latest('id')->firstOrFail();

        $this->assertSame('failed', $failedRun->status);
        $this->assertSame(SepaImportService::STAGE_FAILED, $failedRun->stage);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$failedRun->id));
    }

    private function service(): SepaImportService
    {
        return new SepaImportService(new SepaSourceResolver());
    }

    private function invokePrivate(object $object, string $method, array $args = []): mixed
    {
        $reflection = new \ReflectionMethod($object, $method);
        $reflection->setAccessible(true);

        return $reflection->invokeArgs($object, $args);
    }
}
