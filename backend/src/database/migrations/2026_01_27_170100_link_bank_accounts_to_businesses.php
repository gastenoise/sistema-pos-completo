<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->foreignId('business_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->cascadeOnDelete();
            $table->unique('business_id', 'bank_accounts_business_unique');
        });

        if (Schema::hasTable('bank_account_business')) {
            $pivotRows = DB::table('bank_account_business')
                ->orderByDesc('main')
                ->get();

            $assignedBusinesses = [];
            foreach ($pivotRows as $row) {
                if (isset($assignedBusinesses[$row->business_id])) {
                    continue;
                }
                DB::table('bank_accounts')
                    ->where('id', $row->bank_account_id)
                    ->update(['business_id' => $row->business_id]);
                $assignedBusinesses[$row->business_id] = true;
            }

            Schema::dropIfExists('bank_account_business');
        }
    }

    public function down(): void
    {
        Schema::create('bank_account_business', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->cascadeOnDelete();
            $table->boolean('main')->default(false)->comment('Indica si es la principal del negocio');
            $table->timestamps();
            $table->unique(['business_id', 'bank_account_id'], 'biz_bank_unique');
        });

        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropUnique('bank_accounts_business_unique');
            $table->dropForeign(['business_id']);
            $table->dropColumn('business_id');
        });
    }
};
