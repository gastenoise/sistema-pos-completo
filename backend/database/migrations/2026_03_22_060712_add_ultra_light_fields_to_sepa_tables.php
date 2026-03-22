<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sepa_import_runs', function (Blueprint $table) {
            $table->string('current_stage')->nullable()->after('stage');
            $table->timestamp('next_action_at')->nullable()->after('current_stage');
            $table->timestamp('locked_at')->nullable()->after('next_action_at');
            $table->unsignedInteger('attempts')->default(0)->after('locked_at');
            $table->boolean('artifacts_ready')->default(false)->after('attempts');
            $table->boolean('discovery_completed')->default(false)->after('artifacts_ready');
            $table->timestamp('finalized_at')->nullable()->after('finished_at');
        });

        Schema::table('sepa_import_run_files', function (Blueprint $table) {
            $table->unsignedBigInteger('last_line_number')->default(0)->after('csv_path');
            $table->json('csv_headers')->nullable()->after('last_line_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sepa_import_runs', function (Blueprint $table) {
            $table->dropColumn([
                'current_stage',
                'next_action_at',
                'locked_at',
                'attempts',
                'artifacts_ready',
                'discovery_completed',
                'finalized_at',
            ]);
        });

        Schema::table('sepa_import_run_files', function (Blueprint $table) {
            $table->dropColumn(['last_line_number', 'csv_headers']);
        });
    }
};
