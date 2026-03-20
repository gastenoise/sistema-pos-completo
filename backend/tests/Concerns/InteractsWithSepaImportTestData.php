<?php

namespace Tests\Concerns;

use App\Services\Sepa\SepaImportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use ZipArchive;

trait InteractsWithSepaImportTestData
{
    protected function configureSepaDayUrls(): void
    {
        config()->set('sepa.day_urls', [
            'lunes' => 'http://example.com/sepa.zip',
            'martes' => 'http://example.com/sepa.zip',
            'miercoles' => 'http://example.com/sepa.zip',
            'jueves' => 'http://example.com/sepa.zip',
            'viernes' => 'http://example.com/sepa.zip',
            'sabado' => 'http://example.com/sepa.zip',
            'domingo' => 'http://example.com/sepa.zip',
        ]);
    }

    protected function createSepaImportTables(): void
    {
        Schema::dropIfExists('sepa_import_run_files');
        Schema::dropIfExists('sepa_import_runs');

        Schema::create('sepa_import_runs', function (Blueprint $table): void {
            $table->id();
            $table->string('day', 20);
            $table->string('requested_date')->nullable();
            $table->string('status', 20)->default('running');
            $table->string('stage', 40)->default(SepaImportService::STAGE_PENDING_DOWNLOAD);
            $table->string('main_zip_path')->nullable();
            $table->string('main_extract_dir')->nullable();
            $table->unsignedInteger('total_zip_files')->default(0);
            $table->unsignedInteger('total_csv_files')->default(0);
            $table->unsignedInteger('next_file_index')->default(0);
            $table->unsignedInteger('downloaded_files')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->json('error_samples')->nullable();
            $table->json('pipeline_state')->nullable();
            $table->json('file_metrics')->nullable();
            $table->json('stage_timestamps')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();
        });

        Schema::create('sepa_import_run_files', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('sepa_import_run_id');
            $table->unsignedInteger('file_index');
            $table->string('zip_path');
            $table->string('extract_dir')->nullable();
            $table->string('csv_path')->nullable();
            $table->string('status', 20)->default('pending');
            $table->json('metrics')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    protected function createSepaItemsTable(): void
    {
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
    }

    protected function clearSepaFilesystem(): void
    {
        File::deleteDirectory(storage_path('app/sepa/tmp'));
        File::deleteDirectory(storage_path('framework/testing/sepa-fixtures'));
    }

    /**
     * @return array<int, array<int, array<string, string>>>
     */
    protected function sampleArchives(): array
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

    protected function fakeSepaDownload(array $archives): void
    {
        $zipPath = $this->buildMainZip($archives);

        Http::fake([
            '*' => Http::response(file_get_contents($zipPath), 200, ['Content-Type' => 'application/zip']),
        ]);
    }

    protected function buildMainZip(array $archives): string
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
    protected function productosCsv(array $rows): string
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
}
