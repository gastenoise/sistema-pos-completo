<?php

namespace Tests\Unit;

use App\Models\SepaItem;
use App\Services\Sepa\SepaImportService;
use App\Services\Sepa\SepaSourceResolver;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class SepaImportServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('sepa_import_runs');
        Schema::create('sepa_import_runs', function (Blueprint $table): void {
            $table->id();
            $table->string('day', 20);
            $table->string('requested_date')->nullable();
            $table->string('status', 20)->default('running');
            $table->unsignedInteger('downloaded_files')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->json('error_samples')->nullable();
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

    public function test_it_cleans_up_temporary_directory_after_import_failure(): void
    {
        $resolver = $this->createMock(SepaSourceResolver::class);
        $resolver->method('resolveUrlForDay')->willReturn('http://example.com/sepa.zip');

        // We'll mock the internal executeImport to create a directory and then throw
        $service = $this->getMockBuilder(SepaImportService::class)
            ->setConstructorArgs([$resolver])
            ->onlyMethods(['executeImport'])
            ->getMock();

        $service->expects($this->once())
            ->method('executeImport')
            ->willReturnCallback(function ($day, $runId) {
                $dir = storage_path("app/sepa/tmp/run_{$runId}");
                if (!is_dir($dir)) {
                    mkdir($dir, 0775, true);
                }
                file_put_contents($dir . '/test.txt', 'test');
                throw new \RuntimeException('Simulated import failure');
            });

        try {
            $service->import('lunes');
        } catch (\RuntimeException $e) {
            $this->assertSame('Simulated import failure', $e->getMessage());
        }

        $tmpDir = storage_path('app/sepa/tmp/run_1');
        $this->assertDirectoryDoesNotExist($tmpDir);
    }

    public function test_it_skips_import_when_lock_is_not_acquired(): void
    {
        $lock = Mockery::mock(Lock::class);
        $lock->shouldReceive('get')->once()->andReturnFalse();

        Cache::shouldReceive('lock')->once()->with('sepa:sync:lunes', Mockery::type('int'))->andReturn($lock);
        Log::shouldReceive('warning')->once();

        $run = $this->service()->import('lunes', '2026-04-07');

        $this->assertSame('skipped_locked', $run->status);
        $this->assertSame('lunes', $run->day);
        $this->assertSame('2026-04-07', $run->requested_date);
        $this->assertSame(0, $run->duration_seconds);
        $this->assertDatabaseCount('sepa_items', 0);
    }

    public function test_it_releases_lock_after_import_finishes(): void
    {
        $resolver = $this->createMock(SepaSourceResolver::class);
        $lock = Mockery::mock(Lock::class);
        $lock->shouldReceive('get')->once()->andReturnTrue();
        $lock->shouldReceive('release')->once();

        Cache::shouldReceive('lock')->once()->with('sepa:sync:lunes', Mockery::type('int'))->andReturn($lock);

        $service = $this->getMockBuilder(SepaImportService::class)
            ->setConstructorArgs([$resolver])
            ->onlyMethods(['executeImport'])
            ->getMock();

        $service->expects($this->once())
            ->method('executeImport')
            ->willReturn([
                'downloaded_files' => 1,
                'valid_rows' => 1,
                'invalid_rows' => 0,
                'inserted_rows' => 1,
                'updated_rows' => 0,
                'error_samples' => [],
            ]);

        $run = $service->import('lunes');

        $this->assertSame('success', $run->status);
        $this->assertSame(1, $run->downloaded_files);
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
