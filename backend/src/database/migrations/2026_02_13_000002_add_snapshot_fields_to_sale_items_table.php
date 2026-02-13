<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->string('item_type_snapshot', 20)->default('product')->after('unit_price_snapshot');
            $table->foreignId('category_id_snapshot')->nullable()->after('item_type_snapshot')->constrained('categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id_snapshot');
            $table->dropColumn('item_type_snapshot');
        });
    }
};
