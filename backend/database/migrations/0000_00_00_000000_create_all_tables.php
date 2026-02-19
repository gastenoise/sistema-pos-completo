<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });

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

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#3B82F6');
            $table->unsignedTinyInteger('icon')->nullable()->comment('Icon id entre 1 y 30');
            $table->timestamps();
            $table->unique(['business_id', 'name']);
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->dateTime('last_price_update_at')->nullable();
            $table->decimal('last_price_update_rate', 10, 4)->nullable();
            $table->timestamps();

            $table->index(['business_id', 'name'], 'items_business_name_idx');
            $table->index(['business_id', 'barcode'], 'items_business_barcode_idx');
            $table->index(['business_id', 'sku'], 'items_business_sku_idx');
        });

        Schema::create('sepa_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('barcode');
            $table->decimal('price', 12, 2);
            $table->decimal('presentation_quantity', 12, 2)->nullable();
            $table->string('presentation_unit', 20)->nullable();
            $table->string('brand', 120)->nullable();
            $table->decimal('list_price', 12, 2)->nullable();
            $table->timestamps();

            $table->unique('barcode', 'sepa_items_barcode_unique');
            $table->index('barcode', 'sepa_items_barcode_idx');
            $table->index('name', 'sepa_items_name_idx');
        });

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('sepa_items', function (Blueprint $table) {
                $table->fullText('name', 'sepa_items_name_fulltext_idx');
            });
        }

        if ($driver === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            DB::statement('CREATE INDEX IF NOT EXISTS sepa_items_name_trgm_idx ON sepa_items USING gin (name gin_trgm_ops)');
        }

        Schema::create('sepa_item_business_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sepa_item_id')->constrained('sepa_items')->cascadeOnDelete();
            $table->decimal('price', 12, 2)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->timestamps();

            $table->unique(['business_id', 'sepa_item_id'], 'sepa_item_business_prices_unique');
            $table->index(['business_id', 'category_id'], 'sepa_item_business_prices_business_category_idx');
        });

        Schema::create('sepa_import_runs', function (Blueprint $table) {
            $table->id();
            $table->string('day', 20);
            $table->string('requested_date')->nullable();
            $table->string('status', 20)->default('running');
            $table->unsignedInteger('downloaded_files')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->unsignedInteger('inserted_rows')->default(0);
            $table->unsignedInteger('updated_rows')->default(0);
            $table->json('error_samples')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamps();

            $table->index(['day', 'created_at'], 'sepa_import_runs_day_created_at_idx');
        });

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

        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('cbu', 22)->nullable()->comment('Clave Bancaria Uniforme');
            $table->string('alias', 40)->nullable()->comment('Alias bancario (CBU alias)');
            $table->string('bank_name', 100)->nullable()->comment('Nombre del banco');
            $table->string('account_holder_name')->nullable()->comment('Nombre del titular');
            $table->timestamps();
            $table->unique('business_id', 'bank_accounts_business_unique');
        });

        Schema::create('business_smtp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('host');
            $table->integer('port');
            $table->string('username');
            $table->string('password');
            $table->string('encryption')->nullable();
            $table->string('from_email');
            $table->string('from_name');
            $table->boolean('active')->default(true);
            $table->timestamps();
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

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key_hash', 64)->unique();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['business_id', 'user_id']);
        });

        Schema::create('navigation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('screen')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['business_id', 'user_id', 'created_at']);
        });

        Schema::create('sale_ticket_email_statuses', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_id')->unique();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->string('to_email');
            $table->string('subject')->nullable();
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->string('error_message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('queued_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'created_at'], 'stes_business_created_idx');
            $table->index(['sale_id', 'created_at'], 'stes_sale_created_idx');
            $table->index(['status', 'created_at'], 'stes_status_created_idx');
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS sepa_items_name_trgm_idx');
        }

        Schema::dropIfExists('sale_ticket_email_statuses');
        Schema::dropIfExists('navigation_events');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('imports');
        Schema::dropIfExists('dollar_rates');
        Schema::dropIfExists('cash_register_expected_totals');
        Schema::dropIfExists('cash_closures');
        Schema::dropIfExists('sale_payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('cash_register_sessions');
        Schema::dropIfExists('business_smtp_settings');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('business_payment_method_hides');
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropForeign(['preferred_payment_method_id']);
            $table->dropColumn('preferred_payment_method_id');
        });
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('sepa_import_runs');
        Schema::dropIfExists('sepa_item_business_prices');
        Schema::dropIfExists('sepa_items');
        Schema::dropIfExists('items');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('business_parameters');
        Schema::dropIfExists('business_users');
        Schema::dropIfExists('businesses');
        Schema::dropIfExists('users');
    }
};
