<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table): void {
            $table->string('barcode', 64)->nullable()->after('sku');
        });

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX items_business_barcode_unique ON items (business_id, barcode) WHERE barcode IS NOT NULL');
            return;
        }

        Schema::table('items', function (Blueprint $table): void {
            $table->unique(['business_id', 'barcode'], 'items_business_barcode_unique');
        });
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS items_business_barcode_unique');
        } else {
            Schema::table('items', function (Blueprint $table): void {
                $table->dropUnique('items_business_barcode_unique');
            });
        }

        Schema::table('items', function (Blueprint $table): void {
            $table->dropColumn('barcode');
        });
    }
};
