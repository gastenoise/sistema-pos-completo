<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#3B82F6');
            $table->unsignedTinyInteger('icon')->nullable()->comment('Icon id entre 1 y 30');
            $table->timestamps();

            $table->unique(['business_id', 'name']);
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->dateTime('last_price_update_at')->nullable();
            $table->decimal('last_price_update_rate', 10, 4)->nullable();
            $table->timestamps();

            $table->index(['business_id', 'name'], 'items_business_name_idx');
            $table->index(['business_id', 'barcode'], 'items_business_barcode_idx');
            $table->index(['business_id', 'sku'], 'items_business_sku_idx');
        });

        Schema::create('sepa_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('barcode');
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->timestamps();

            $table->unique('barcode', 'sepa_items_barcode_unique');
            $table->index('barcode', 'sepa_items_barcode_idx');
            $table->index('name', 'sepa_items_name_idx');
        });

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('sepa_items', function (Blueprint $table) {
                $table->fullText('name', 'sepa_items_name_fulltext_idx');
            });
        }

        if ($driver === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement('CREATE INDEX IF NOT EXISTS sepa_items_name_trgm_idx ON sepa_items USING gin (name gin_trgm_ops)');
        }

        Schema::create('sepa_item_business_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sepa_item_id')->constrained('sepa_items')->cascadeOnDelete();
            $table->decimal('price', 12, 2)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->timestamps();

            $table->unique(['business_id', 'sepa_item_id'], 'sepa_item_business_prices_unique');
            $table->index(['business_id', 'category_id'], 'sepa_item_business_prices_business_category_idx');
        });

        Schema::create('sepa_import_runs', function (Blueprint $table) {
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

            $table->index(['day', 'created_at'], 'sepa_import_runs_day_created_at_idx');
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS sepa_items_name_trgm_idx');
        }

        Schema::dropIfExists('sepa_import_runs');
        Schema::dropIfExists('sepa_item_business_prices');
        Schema::dropIfExists('sepa_items');
        Schema::dropIfExists('items');
        Schema::dropIfExists('categories');
    }
};
