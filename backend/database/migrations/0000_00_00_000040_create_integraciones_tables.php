<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
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
        Schema::dropIfExists('sale_ticket_email_statuses');
        Schema::dropIfExists('navigation_events');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('business_smtp_settings');
        Schema::dropIfExists('bank_accounts');
    }
};
