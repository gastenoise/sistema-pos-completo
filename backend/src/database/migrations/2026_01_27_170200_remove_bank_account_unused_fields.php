<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('bank_accounts', 'account_type')) {
                $table->dropColumn('account_type');
            }
            if (Schema::hasColumn('bank_accounts', 'extra')) {
                $table->dropColumn('extra');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('bank_accounts', 'account_type')) {
                $table->string('account_type')->nullable()->comment('Tipo de cuenta si aplica');
            }
            if (!Schema::hasColumn('bank_accounts', 'extra')) {
                $table->json('extra')->nullable()->comment('Campo flexible para otros datos');
            }
        });
    }
};
