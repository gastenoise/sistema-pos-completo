<?php

namespace Tests\Unit;

use App\Services\Items\CsvDelimiterDetector;
use Tests\TestCase;

class CsvDelimiterDetectorTest extends TestCase
{
    public function test_detects_pipe_delimiter_from_sample_lines(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv-delimiter-pipe-');
        file_put_contents($path, "name|barcode|price\nYerba|123|1500\nAzucar|456|1200\n");

        $detector = new CsvDelimiterDetector;

        $this->assertSame('|', $detector->detect($path));
        $this->assertSame('|', $detector->resolve(null, $path));

        @unlink($path);
    }

    public function test_resolve_prioritizes_valid_requested_delimiter(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv-delimiter-comma-');
        file_put_contents($path, "name,barcode,price\nYerba,123,1500\n");

        $detector = new CsvDelimiterDetector;

        $this->assertSame(';', $detector->resolve(';', $path));

        @unlink($path);
    }
}
