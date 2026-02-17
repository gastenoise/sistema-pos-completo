<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sepa_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->string('barcode');
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique('barcode', 'sepa_items_barcode_unique');
            $table->index('barcode', 'sepa_items_barcode_idx');
        });

        Schema::create('sepa_item_business_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sepa_item_id')->constrained('sepa_items')->cascadeOnDelete();
            $table->decimal('price', 12, 2);
            $table->timestamps();

            $table->unique(['business_id', 'sepa_item_id'], 'sepa_item_business_prices_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sepa_item_business_prices');
        Schema::dropIfExists('sepa_items');
    }
};
