<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->decimal('presentation_quantity', 12, 2)->nullable()->after('price');
            $table->string('presentation_unit', 20)->nullable()->after('presentation_quantity');
            $table->string('brand', 120)->nullable()->after('presentation_unit');
            $table->decimal('list_price', 12, 2)->nullable()->after('brand');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['presentation_quantity', 'presentation_unit', 'brand', 'list_price']);
        });
    }
};
