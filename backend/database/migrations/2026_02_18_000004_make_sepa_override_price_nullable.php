<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Use modify to set the price column as nullable using Laravel Schema builder
        Schema::table('sepa_item_business_prices', function ($table) {
            $table->decimal('price', 15, 4)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Use modify to set the price column back to not nullable
        Schema::table('sepa_item_business_prices', function ($table) {
            $table->decimal('price', 15, 4)->nullable(false)->change();
        });
    }
};
