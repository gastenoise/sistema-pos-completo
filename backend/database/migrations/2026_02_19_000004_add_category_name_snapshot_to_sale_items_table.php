<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('sale_items') || Schema::hasColumn('sale_items', 'category_name_snapshot')) {
            return;
        }

        Schema::table('sale_items', function (Blueprint $table) {
            $table->string('category_name_snapshot')->nullable()->after('category_id_snapshot');
        });

        DB::table('sale_items')
            ->leftJoin('categories', 'categories.id', '=', 'sale_items.category_id_snapshot')
            ->whereNull('sale_items.category_name_snapshot')
            ->update([
                'sale_items.category_name_snapshot' => DB::raw('categories.name'),
            ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('sale_items') || !Schema::hasColumn('sale_items', 'category_name_snapshot')) {
            return;
        }

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn('category_name_snapshot');
        });
    }
};
