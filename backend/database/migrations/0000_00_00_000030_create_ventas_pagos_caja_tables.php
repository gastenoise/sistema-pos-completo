<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->unsignedTinyInteger('icon')->nullable()->comment('Icon id entre 1 y 30');
            $table->string('color', 7)->default('#1ABC9C');
        });

        Schema::table('businesses', function (Blueprint $table) {
            $table->foreignId('preferred_payment_method_id')
                ->nullable()
                ->after('email')
                ->constrained('payment_methods')
                ->nullOnDelete();
        });

        Schema::create('business_payment_method_hides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods')->cascadeOnDelete();
            $table->foreignId('hidden_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['business_id', 'payment_method_id'], 'bpmh_unique');
        });

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

            $table->index(['business_id', 'status', 'created_at'], 'sales_biz_status_created_idx');
            $table->index(['business_id', 'created_at'], 'sales_biz_created_idx');
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_source', 16)->default('local');
            $table->foreignId('sepa_item_id')->nullable()->constrained('sepa_items')->nullOnDelete();
            $table->string('item_name_snapshot');
            $table->string('barcode_snapshot')->nullable();
            $table->decimal('unit_price_snapshot', 12, 2);
            $table->foreignId('category_id_snapshot')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('category_name_snapshot')->nullable();
            $table->integer('quantity');
            $table->decimal('total', 12, 2);
            $table->timestamps();

            $table->index(['sale_id', 'item_id'], 'sale_items_sale_item_idx');
            $table->index(['sale_id', 'item_source'], 'sale_items_sale_source_idx');
        });

        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained('payment_methods');
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['pending', 'confirmed', 'failed'])->default('pending');
            $table->string('transaction_reference')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['sale_id', 'status'], 'sale_payments_sale_status_idx');
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
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_register_expected_totals');
        Schema::dropIfExists('cash_closures');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('cash_register_sessions');
        Schema::dropIfExists('business_payment_method_hides');

        Schema::table('businesses', function (Blueprint $table) {
            $table->dropForeign(['preferred_payment_method_id']);
            $table->dropColumn('preferred_payment_method_id');
        });

        Schema::dropIfExists('payment_methods');
    }
};
