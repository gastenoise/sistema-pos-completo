<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sepa_item_business_prices', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('price')->constrained('categories')->nullOnDelete();
            $table->index(['business_id', 'category_id'], 'sepa_item_business_prices_business_category_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sepa_item_business_prices', function (Blueprint $table) {
            $table->dropIndex('sepa_item_business_prices_business_category_idx');
            $table->dropConstrainedForeignId('category_id');
        });
    }
};
