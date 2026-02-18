<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->index(['business_id', 'name'], 'items_business_name_idx');
            $table->index(['business_id', 'barcode'], 'items_business_barcode_idx');
            $table->index(['business_id', 'sku'], 'items_business_sku_idx');
        });

        Schema::table('sepa_items', function (Blueprint $table) {
            $table->index('name', 'sepa_items_name_idx');
            $table->index('sku', 'sepa_items_sku_idx');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_business_name_idx');
            $table->dropIndex('items_business_barcode_idx');
            $table->dropIndex('items_business_sku_idx');
        });

        Schema::table('sepa_items', function (Blueprint $table) {
            $table->dropIndex('sepa_items_name_idx');
            $table->dropIndex('sepa_items_sku_idx');
        });
    }
};
