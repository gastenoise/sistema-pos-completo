<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('items') || !Schema::hasColumn('items', 'active')) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('items') || Schema::hasColumn('items', 'active')) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->boolean('active')->default(true);
        });
    }
};
