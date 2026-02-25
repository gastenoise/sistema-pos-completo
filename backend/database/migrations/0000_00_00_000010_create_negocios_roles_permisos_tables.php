<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('color', 7)->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('currency', 3)->default('ARS');
            $table->string('tax_id', 20)->nullable();
            $table->timestamps();
        });

        Schema::create('business_parameters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('parameter_id', 120);
            $table->timestamps();

            $table->unique(['business_id', 'parameter_id'], 'business_parameters_unique');
            $table->index('parameter_id', 'business_parameters_parameter_idx');
        });

        Schema::create('business_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['owner', 'admin', 'cashier'])->default('cashier');
            $table->timestamps();

            $table->unique(['user_id', 'business_id']);
        });

        Schema::create('dollar_rates', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->decimal('rate', 10, 2);
            $table->string('source');
            $table->timestamps();
        });

        Schema::create('imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->string('source')->default('csv');
            $table->string('status');
            $table->json('summary')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imports');
        Schema::dropIfExists('dollar_rates');
        Schema::dropIfExists('business_users');
        Schema::dropIfExists('business_parameters');
        Schema::dropIfExists('businesses');
    }
};
