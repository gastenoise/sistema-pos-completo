<?php

use App\Models\BusinessParameter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('businesses') || !DB::getSchemaBuilder()->hasTable('business_parameters')) {
            return;
        }

        $now = now();

        DB::table('businesses')
            ->select('id')
            ->orderBy('id')
            ->chunkById(500, function ($businesses) use ($now): void {
                $rows = $businesses->map(fn ($business) => [
                    'business_id' => $business->id,
                    'parameter_id' => BusinessParameter::AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                DB::table('business_parameters')->upsert(
                    $rows,
                    ['business_id', 'parameter_id'],
                    ['updated_at']
                );
            });
    }

    public function down(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('business_parameters')) {
            return;
        }

        DB::table('business_parameters')
            ->where('parameter_id', BusinessParameter::AUTO_OPEN_ITEM_CREATE_ON_UNKNOWN_BARCODE)
            ->delete();
    }
};
