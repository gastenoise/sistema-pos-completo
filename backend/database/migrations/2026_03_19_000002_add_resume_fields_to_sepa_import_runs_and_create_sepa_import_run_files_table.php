<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('sepa_import_runs', function (Blueprint $table): void {
            $table->string('main_zip_path')->nullable()->after('stage');
            $table->string('main_extract_dir')->nullable()->after('main_zip_path');
            $table->unsignedInteger('total_zip_files')->default(0)->after('main_extract_dir');
            $table->unsignedInteger('total_csv_files')->default(0)->after('total_zip_files');
            $table->unsignedInteger('next_file_index')->default(0)->after('total_csv_files');
            $table->json('file_metrics')->nullable()->after('pipeline_state');
            $table->json('stage_timestamps')->nullable()->after('file_metrics');
        });

        Schema::create('sepa_import_run_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sepa_import_run_id')->constrained('sepa_import_runs')->cascadeOnDelete();
            $table->unsignedInteger('file_index');
            $table->string('zip_path');
            $table->string('extract_dir')->nullable();
            $table->string('csv_path')->nullable();
            $table->string('status', 20)->default('pending');
            $table->json('metrics')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['sepa_import_run_id', 'file_index'], 'sepa_import_run_files_run_file_index_unique');
            $table->index(['sepa_import_run_id', 'status'], 'sepa_import_run_files_run_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sepa_import_run_files');

        Schema::table('sepa_import_runs', function (Blueprint $table): void {
            $table->dropColumn([
                'main_zip_path',
                'main_extract_dir',
                'total_zip_files',
                'total_csv_files',
                'next_file_index',
                'file_metrics',
                'stage_timestamps',
            ]);
        });
    }
};
