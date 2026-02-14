<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $businessIds = DB::table('items')
            ->whereIn('type', ['service', 'fee'])
            ->distinct()
            ->pluck('business_id');

        foreach ($businessIds as $businessId) {
            $serviceCategoryId = DB::table('categories')
                ->where('business_id', $businessId)
                ->where('name', 'Servicio')
                ->value('id');

            if (!$serviceCategoryId) {
                $serviceCategoryId = DB::table('categories')->insertGetId([
                    'business_id' => $businessId,
                    'name' => 'Servicio',
                    'color' => '#3B82F6',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $feeCategoryId = DB::table('categories')
                ->where('business_id', $businessId)
                ->where('name', 'Comisión')
                ->value('id');

            if (!$feeCategoryId) {
                $feeCategoryId = DB::table('categories')->insertGetId([
                    'business_id' => $businessId,
                    'name' => 'Comisión',
                    'color' => '#3B82F6',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('items')
                ->where('business_id', $businessId)
                ->where('type', 'service')
                ->update(['category_id' => $serviceCategoryId]);

            DB::table('items')
                ->where('business_id', $businessId)
                ->where('type', 'fee')
                ->update(['category_id' => $feeCategoryId]);
        }

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->enum('type', ['product', 'service', 'fee'])->default('product')->after('category_id');
        });

        $serviceCategoryIds = DB::table('categories')
            ->where('name', 'Servicio')
            ->pluck('id');

        if ($serviceCategoryIds->isNotEmpty()) {
            DB::table('items')
                ->whereIn('category_id', $serviceCategoryIds)
                ->update(['type' => 'service']);
        }

        $feeCategoryIds = DB::table('categories')
            ->whereIn('name', ['Comisión', 'Comision'])
            ->pluck('id');

        if ($feeCategoryIds->isNotEmpty()) {
            DB::table('items')
                ->whereIn('category_id', $feeCategoryIds)
                ->update(['type' => 'fee']);
        }
    }
};

