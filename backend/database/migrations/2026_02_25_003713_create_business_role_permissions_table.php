<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('business_role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['owner', 'admin', 'cashier']);
            $table->string('permission_key', 120);
            $table->boolean('allowed')->default(false);
            $table->timestamps();

            $table->unique(['business_id', 'role', 'permission_key'], 'business_role_permissions_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_role_permissions');
    }
};
