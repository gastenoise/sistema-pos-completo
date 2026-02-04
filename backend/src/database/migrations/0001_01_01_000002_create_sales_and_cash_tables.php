<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained();
            $table->foreignId('opened_by')->constrained('users');
            $table->timestamp('opened_at');
            $table->decimal('opening_cash_amount', 12, 2);
            $table->timestamp('closed_at')->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamps();
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained();
            $table->foreignId('cash_register_session_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->enum('status', ['open', 'closed', 'voided'])->default('open');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users');
            $table->text('void_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name_snapshot');
            $table->decimal('unit_price_snapshot', 12, 2);
            $table->integer('quantity');
            $table->decimal('total', 12, 2);
            $table->timestamps();
        });

        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods');
            $table->decimal('amount', 12, 2);

            $table->enum('status', ['pending','confirmed','failed'])->default('pending');
            $table->string('transaction_reference')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });

        Schema::create('cash_closures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained();
            $table->foreignId('cash_register_session_id')->constrained();
            $table->decimal('expected_cash', 12, 2);
            $table->decimal('real_cash', 12, 2);
            $table->decimal('difference', 12, 2);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('cash_register_expected_totals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods');
            $table->decimal('expected_amount', 12, 2)->default(0);
            $table->unique(['cash_register_session_id', 'payment_method_id'], 'cr_exp_tot_unique');
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

    public function down(): void {
        Schema::dropIfExists('imports');
        Schema::dropIfExists('dollar_rates');
        Schema::dropIfExists('cash_register_expected_totals');
        Schema::dropIfExists('cash_closures');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('cash_register_sessions');
    }
};
