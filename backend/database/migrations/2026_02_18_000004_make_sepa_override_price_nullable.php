<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sepa_item_business_prices', function ($table) {
            $table->decimal('price', 12, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sepa_item_business_prices', function ($table) {
            $table->decimal('price', 12, 2)->nullable(false)->change();
        });
    }
};
