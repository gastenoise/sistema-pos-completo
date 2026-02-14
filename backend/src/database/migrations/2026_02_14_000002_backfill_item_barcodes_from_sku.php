<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement(<<<'SQL'
                UPDATE items AS i
                SET barcode = i.sku
                FROM (
                    SELECT business_id, sku
                    FROM items
                    WHERE sku IS NOT NULL
                      AND sku <> ''
                    GROUP BY business_id, sku
                    HAVING COUNT(*) = 1
                ) AS unique_sku
                WHERE unique_sku.business_id = i.business_id
                  AND unique_sku.sku = i.sku
                  AND i.barcode IS NULL
                  AND i.sku IS NOT NULL
                  AND i.sku <> ''
                  AND NOT EXISTS (
                      SELECT 1
                      FROM items existing_barcode
                      WHERE existing_barcode.business_id = i.business_id
                        AND existing_barcode.barcode = i.sku
                        AND existing_barcode.id <> i.id
                  )
            SQL);

            return;
        }

        DB::statement(<<<'SQL'
                UPDATE items i
                JOIN (
                    SELECT business_id, sku
                    FROM items
                    WHERE sku IS NOT NULL
                      AND sku <> ''
                    GROUP BY business_id, sku
                    HAVING COUNT(*) = 1
                ) unique_sku ON unique_sku.business_id = i.business_id
                    AND unique_sku.sku = i.sku
                LEFT JOIN items existing_barcode
                    ON existing_barcode.business_id = i.business_id
                    AND existing_barcode.barcode = i.sku
                    AND existing_barcode.id <> i.id
                SET i.barcode = i.sku
                WHERE i.barcode IS NULL
                  AND i.sku IS NOT NULL
                  AND i.sku <> ''
                  AND existing_barcode.id IS NULL
            SQL);
    }

    public function down(): void
    {
        DB::statement('UPDATE items SET barcode = NULL WHERE barcode = sku');
    }
};
