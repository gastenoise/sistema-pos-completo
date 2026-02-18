<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('sepa_items', function (Blueprint $table) {
                $table->fullText('name', 'sepa_items_name_fulltext_idx');
            });

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement('CREATE INDEX IF NOT EXISTS sepa_items_name_trgm_idx ON sepa_items USING gin (name gin_trgm_ops)');
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('sepa_items', function (Blueprint $table) {
                $table->dropFullText('sepa_items_name_fulltext_idx');
            });

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS sepa_items_name_trgm_idx');
        }
    }
};
