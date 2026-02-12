<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->index(['business_id', 'status', 'created_at'], 'sales_biz_status_created_idx');
            $table->index(['business_id', 'created_at'], 'sales_biz_created_idx');
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->index(['sale_id', 'status'], 'sale_payments_sale_status_idx');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->index(['sale_id', 'item_id'], 'sale_items_sale_item_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropIndex('sale_items_sale_item_idx');
        });

        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropIndex('sale_payments_sale_status_idx');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex('sales_biz_created_idx');
            $table->dropIndex('sales_biz_status_created_idx');
        });
    }
};
