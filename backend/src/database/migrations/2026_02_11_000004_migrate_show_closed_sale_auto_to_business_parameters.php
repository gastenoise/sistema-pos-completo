<?php

use App\Models\BusinessParameter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('businesses', 'show_closed_sale_automatically')) {
            $enabledBusinessIds = DB::table('businesses')
                ->where('show_closed_sale_automatically', true)
                ->pluck('id');

            foreach ($enabledBusinessIds as $businessId) {
                DB::table('business_parameters')->updateOrInsert(
                    [
                        'business_id' => $businessId,
                        'parameter_id' => BusinessParameter::SHOW_CLOSED_SALE_AUTOMATICALLY,
                    ],
                    [
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            Schema::table('businesses', function (Blueprint $table) {
                $table->dropColumn('show_closed_sale_automatically');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('businesses', 'show_closed_sale_automatically')) {
            Schema::table('businesses', function (Blueprint $table) {
                $table->boolean('show_closed_sale_automatically')
                    ->default(false)
                    ->after('preferred_payment_method_id');
            });
        }

        $enabledBusinessIds = DB::table('business_parameters')
            ->where('parameter_id', BusinessParameter::SHOW_CLOSED_SALE_AUTOMATICALLY)
            ->pluck('business_id');

        if ($enabledBusinessIds->isNotEmpty()) {
            DB::table('businesses')
                ->whereIn('id', $enabledBusinessIds)
                ->update(['show_closed_sale_automatically' => true]);
        }

        DB::table('business_parameters')
            ->where('parameter_id', BusinessParameter::SHOW_CLOSED_SALE_AUTOMATICALLY)
            ->delete();
    }
};
