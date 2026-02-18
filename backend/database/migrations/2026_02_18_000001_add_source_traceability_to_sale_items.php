<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->string('item_source', 16)->default('local')->after('item_id');
            $table->foreignId('sepa_item_id')->nullable()->after('item_source')->constrained('sepa_items')->nullOnDelete();
            $table->string('barcode_snapshot')->nullable()->after('item_name_snapshot');
            $table->index(['sale_id', 'item_source'], 'sale_items_sale_source_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropIndex('sale_items_sale_source_idx');
            $table->dropConstrainedForeignId('sepa_item_id');
            $table->dropColumn(['item_source', 'barcode_snapshot']);
        });
    }
};

