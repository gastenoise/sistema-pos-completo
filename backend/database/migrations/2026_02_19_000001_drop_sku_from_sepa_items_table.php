<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('sepa_items') || !Schema::hasColumn('sepa_items', 'sku')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('DROP INDEX IF EXISTS sepa_items_sku_idx ON sepa_items');
        } elseif (in_array($driver, ['pgsql', 'sqlite'], true)) {
            DB::statement('DROP INDEX IF EXISTS sepa_items_sku_idx');
        }

        Schema::table('sepa_items', function (Blueprint $table) {
            $table->dropColumn('sku');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sepa_items') || Schema::hasColumn('sepa_items', 'sku')) {
            return;
        }

        Schema::table('sepa_items', function (Blueprint $table) {
            $table->string('sku')->nullable()->after('name');
            $table->index('sku', 'sepa_items_sku_idx');
        });
    }
};
