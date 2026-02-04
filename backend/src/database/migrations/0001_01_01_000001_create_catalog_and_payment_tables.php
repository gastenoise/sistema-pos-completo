<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('color')->nullable()->comment('Valor entre 1 y 12, color asignado a la categoría');
            $table->timestamps();
            $table->unique(['business_id', 'name']);
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['product', 'service', 'fee']);
            $table->string('name');
            $table->string('sku')->nullable();
            $table->decimal('price', 12, 2);
            $table->boolean('active')->default(true);
            $table->dateTime('last_price_update_at')->nullable();
            $table->decimal('last_price_update_rate', 10, 4)->nullable();
            $table->timestamps();
            $table->index(['business_id', 'sku']);
        });

        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->unsignedTinyInteger('color')->default(1)->comment('Valor del color asignado al método de pago, por defecto 1');
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
            $table->string('cbu', 22)->nullable()->comment('Clave Bancaria Uniforme');
            $table->string('alias', 40)->nullable()->comment('Alias bancario (CBU alias)');
            $table->string('bank_name', 100)->nullable()->comment('Nombre del banco');
            $table->string('account_holder_name')->nullable()->comment('Nombre del titular');
            $table->timestamps();
        });

        Schema::create('bank_account_business', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->cascadeOnDelete();
            $table->boolean('main')->default(false)->comment('Indica si es la principal del negocio');
            $table->timestamps();
            $table->unique(['business_id', 'bank_account_id'], 'biz_bank_unique');
        });

        Schema::create('business_smtp_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')
                ->constrained()
                ->cascadeOnDelete()
                ->unique();

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
    }

    public function down(): void {
        Schema::dropIfExists('business_smtp_settings');
        Schema::dropIfExists('bank_account_business');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('business_payment_method_hides');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('items');
        Schema::dropIfExists('categories');
    }
};
