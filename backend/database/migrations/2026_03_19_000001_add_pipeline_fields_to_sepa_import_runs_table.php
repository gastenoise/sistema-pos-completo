<?php

use App\Services\Sepa\SepaImportService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sepa_import_runs', function (Blueprint $table): void {
            $table->string('stage', 40)
                ->default(SepaImportService::STAGE_PENDING_DOWNLOAD)
                ->after('status');
            $table->json('pipeline_state')->nullable()->after('error_samples');
        });

        DB::table('sepa_import_runs')
            ->where('status', 'success')
            ->update(['stage' => SepaImportService::STAGE_COMPLETED]);

        DB::table('sepa_import_runs')
            ->where('status', 'failed')
            ->update(['stage' => SepaImportService::STAGE_FAILED]);
    }

    public function down(): void
    {
        Schema::table('sepa_import_runs', function (Blueprint $table): void {
            $table->dropColumn(['stage', 'pipeline_state']);
        });
    }
};
