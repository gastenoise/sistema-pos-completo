<?php

namespace Tests\Unit;

use App\Jobs\Sepa\ProcessSepaImportSliceJob;
use App\Models\SepaImportRun;
use App\Models\SepaItem;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;
use ZipArchive;

class SepaImportServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('sepa.day_urls', [
            'lunes' => 'http://example.com/sepa.zip',
            'martes' => 'http://example.com/sepa.zip',
            'miercoles' => 'http://example.com/sepa.zip',
            'jueves' => 'http://example.com/sepa.zip',
            'viernes' => 'http://example.com/sepa.zip',
            'sabado' => 'http://example.com/sepa.zip',
            'domingo' => 'http://example.com/sepa.zip',
        ]);

        Schema::dropIfExists('sepa_import_runs');
        Schema::create('sepa_import_runs', function (Blueprint $table): void {
            $table->id();
            $table->string('day', 20);
            $table->string('requested_date')->nullable();
            $table->string('status', 20)->default('running');
            $table->string('stage', 40)->default(SepaImportService::STAGE_PENDING_DOWNLOAD);
            $table->unsignedInteger('downloaded_files')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->json('error_samples')->nullable();
            $table->json('pipeline_state')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();
        });

        Schema::dropIfExists('sepa_items');
        Schema::create('sepa_items', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('barcode')->unique();
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->timestamps();
        });

        File::deleteDirectory(storage_path('app/sepa/tmp'));
        File::deleteDirectory(storage_path('framework/testing/sepa-fixtures'));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/sepa/tmp'));
        File::deleteDirectory(storage_path('framework/testing/sepa-fixtures'));

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

        $this->invokePrivate($service, 'persistChunk', [$batch, &$metrics]);

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
    }

    public function test_a_run_can_remain_in_an_intermediate_state_without_finishing(): void
    {
        $this->fakeSepaDownload($this->sampleArchives());
        $service = $this->service();

        $run = $service->startRun('lunes', '2026-03-19');
        $run = $service->downloadArtifacts($run);
        $run = $service->discoverInnerArchives($run);

        $this->assertSame('running', $run->status);
        $this->assertSame(SepaImportService::STAGE_PENDING_PROCESSING, $run->stage);
        $this->assertNull($run->finished_at);
        $this->assertSame(3, $run->downloaded_files);
        $this->assertSame(0, $run->valid_rows);
        $this->assertSame(0, SepaItem::query()->count());
        $this->assertSame(0, $run->pipeline_state['next_archive_index']);
        $this->assertCount(2, $run->pipeline_state['inner_zip_files']);
    }

    public function test_process_slice_job_only_processes_one_inner_archive(): void
    {
        $this->fakeSepaDownload($this->sampleArchives());
        $service = $this->service();

        $run = $service->startRun('lunes', '2026-03-19');
        $run = $service->downloadArtifacts($run);
        $run = $service->discoverInnerArchives($run);

        $job = new ProcessSepaImportSliceJob($run->id);
        $job->handle($service);

        $run = $run->fresh();

        $this->assertSame('running', $run->status);
        $this->assertSame(SepaImportService::STAGE_PENDING_PROCESSING, $run->stage);
        $this->assertSame(1, $run->pipeline_state['next_archive_index']);
        $this->assertSame(1, $run->valid_rows);
        $this->assertSame(1, $run->inserted_rows);
        $this->assertSame(1, SepaItem::query()->count());
        $this->assertDatabaseHas('sepa_items', ['barcode' => '7790000000001']);
        $this->assertDatabaseMissing('sepa_items', ['barcode' => '7790000000002']);
    }

    public function test_multiple_sync_command_executions_complete_the_same_run(): void
    {
        $this->fakeSepaDownload($this->sampleArchives());

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $this->assertSame(SepaImportService::STAGE_PENDING_DISCOVERY, SepaImportRun::query()->first()->stage);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $this->assertSame(SepaImportService::STAGE_PENDING_PROCESSING, SepaImportRun::query()->first()->stage);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $this->assertSame(1, SepaImportRun::query()->first()->pipeline_state['next_archive_index']);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();
        $this->assertSame(SepaImportService::STAGE_PENDING_FINALIZE, SepaImportRun::query()->first()->stage);

        $this->artisan('sepa:sync', ['--day' => 'lunes', '--date' => '2026-03-19', '--sync' => true])
            ->assertSuccessful();

        $run = SepaImportRun::query()->first();

        $this->assertSame('success', $run->status);
        $this->assertSame(SepaImportService::STAGE_COMPLETED, $run->stage);
        $this->assertSame(3, $run->downloaded_files);
        $this->assertSame(3, $run->valid_rows);
        $this->assertSame(3, $run->inserted_rows);
        $this->assertNotNull($run->finished_at);
        $this->assertDatabaseCount('sepa_items', 3);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$run->id));
    }

    public function test_it_cleans_up_temporary_directory_after_import_failure(): void
    {
        $resolver = $this->createMock(SepaSourceResolver::class);
        $resolver->method('resolveUrlForDay')->willReturn('http://example.com/sepa.zip');

        $service = new class($resolver) extends SepaImportService {
            protected function downloadMainZip(string $url, string $destinationPath): void
            {
                file_put_contents($destinationPath, 'broken');
                throw new RuntimeException('Simulated import failure');
            }
        };

        try {
            $service->import('lunes');
            $this->fail('The import should throw an exception.');
        } catch (RuntimeException $e) {
            $this->assertSame('Simulated import failure', $e->getMessage());
        }

        $run = SepaImportRun::query()->firstOrFail();

        $this->assertSame('failed', $run->status);
        $this->assertSame(SepaImportService::STAGE_FAILED, $run->stage);
        $this->assertDirectoryDoesNotExist(storage_path('app/sepa/tmp/run_'.$run->id));
    }

    private function service(): SepaImportService
    {
        return new SepaImportService(new SepaSourceResolver());
    }

    /**
     * @return array<int, array<int, array<string, string>>>
     */
    private function sampleArchives(): array
    {
        return [
            [
                [
                    'id_producto' => '7790000000001',
                    'productos_ean' => '7790000000001',
                    'productos_descripcion' => 'Producto Uno',
                    'productos_precio_lista' => '100.00',
                    'productos_precio_vta1' => '100.00',
                    'productos_cantidad_presentacion' => '1',
                    'productos_unidad_medida_presentacion' => 'UNIDAD',
                    'productos_marca' => 'Marca Uno',
                ],
            ],
            [
                [
                    'id_producto' => '7790000000002',
                    'productos_ean' => '7790000000002',
                    'productos_descripcion' => 'Producto Dos',
                    'productos_precio_lista' => '200.00',
                    'productos_precio_vta1' => '200.00',
                    'productos_cantidad_presentacion' => '1',
                    'productos_unidad_medida_presentacion' => 'UNIDAD',
                    'productos_marca' => 'Marca Dos',
                ],
                [
                    'id_producto' => '7790000000003',
                    'productos_ean' => '7790000000003',
                    'productos_descripcion' => 'Producto Tres',
                    'productos_precio_lista' => '300.00',
                    'productos_precio_vta1' => '300.00',
                    'productos_cantidad_presentacion' => '1',
                    'productos_unidad_medida_presentacion' => 'UNIDAD',
                    'productos_marca' => 'Marca Tres',
                ],
            ],
        ];
    }

    private function fakeSepaDownload(array $archives): void
    {
        $zipPath = $this->buildMainZip($archives);

        Http::fake([
            '*' => Http::response(file_get_contents($zipPath), 200, ['Content-Type' => 'application/zip']),
        ]);
    }

    private function buildMainZip(array $archives): string
    {
        $baseDir = storage_path('framework/testing/sepa-fixtures/'.uniqid('sepa_', true));
        $dateDir = $baseDir.'/20260319';
        File::ensureDirectoryExists($dateDir);

        foreach ($archives as $index => $rows) {
            $innerZipPath = $dateDir.'/archivo_'.($index + 1).'.zip';
            $innerZip = new ZipArchive();
            $this->assertTrue($innerZip->open($innerZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true);
            $innerZip->addFromString('productos.csv', $this->productosCsv($rows));
            $innerZip->close();
        }

        $mainZipPath = $baseDir.'/sepa_main.zip';
        $mainZip = new ZipArchive();
        $this->assertTrue($mainZip->open($mainZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true);

        foreach (glob($dateDir.'/*.zip') ?: [] as $file) {
            $mainZip->addFile($file, '20260319/'.basename($file));
        }

        $mainZip->close();

        return $mainZipPath;
    }

    /**
     * @param array<int, array<string, string>> $rows
     */
    private function productosCsv(array $rows): string
    {
        $headers = [
            'id_producto',
            'productos_ean',
            'productos_descripcion',
            'productos_precio_lista',
            'productos_precio_vta1',
            'productos_cantidad_presentacion',
            'productos_unidad_medida_presentacion',
            'productos_marca',
        ];

        $lines = [implode('|', $headers)];

        foreach ($rows as $row) {
            $lines[] = implode('|', array_map(static fn (string $header): string => $row[$header] ?? '', $headers));
        }

        return implode("\n", $lines)."\n";
    }

    private function invokePrivate(object $object, string $method, array $args = []): mixed
    {
        $reflection = new \ReflectionMethod($object, $method);
        $reflection->setAccessible(true);

        return $reflection->invokeArgs($object, $args);
    }
}
