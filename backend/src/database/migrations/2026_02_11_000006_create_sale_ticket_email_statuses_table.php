<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
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
    }
};
