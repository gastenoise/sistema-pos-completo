<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id_snapshot')->nullable()->after('item_id');
            $table->string('category_name_snapshot')->nullable()->after('category_id_snapshot');
            $table->index('category_id_snapshot', 'sale_items_category_snapshot_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropIndex('sale_items_category_snapshot_idx');
            $table->dropColumn(['category_id_snapshot', 'category_name_snapshot']);
        });
    }
};
