<?php

namespace Tests\Unit;

use App\Services\Items\CsvPreviewParser;
use Tests\TestCase;

class CsvPreviewParserTest extends TestCase
{
    public function test_parse_metadata_returns_columns_sample_total_and_errors(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv-preview-parser-');
        file_put_contents($path, "Name,Barcode,Price\nYerba,123,1500\nAzucar,456,1200,extra\nCafe,789,2200\n");

        $parser = new CsvPreviewParser;
        $metadata = $parser->parseMetadata($path, ',', true);

        $this->assertSame(['name', 'barcode', 'price'], $metadata['columns']);
        $this->assertSame(2, $metadata['total_rows']);
        $this->assertCount(1, $metadata['parsing_errors']);
        $this->assertSame('Yerba', $metadata['sample'][0]['name']);

        @unlink($path);
    }

    public function test_get_rows_page_skips_invalid_rows_and_paginates(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv-preview-page-');
        file_put_contents($path, "name,barcode,price\nA,001,10\nB,002,20,extra\nC,003,30\nD,004,40\n");

        $parser = new CsvPreviewParser;
        $rows = $parser->getRowsPage($path, ',', ['name', 'barcode', 'price'], 2, 1);

        $this->assertCount(1, $rows);
        $this->assertSame('C', $rows[0]['name']);

        @unlink($path);
    }
}
