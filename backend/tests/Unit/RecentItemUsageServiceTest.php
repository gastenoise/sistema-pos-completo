<?php

namespace Tests\Unit;

use App\Services\Items\RecentItemUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class RecentItemUsageServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('cache.default', 'array');
    }

    public function test_record_accumulates_score_and_orders_top_keys(): void
    {
        Cache::flush();
        $service = new RecentItemUsageService();

        $service->record(10, 'local', 100, 2);
        $service->record(10, 'sepa', 200, 1);
        $service->record(10, 'local', 100, 3);

        $keys = $service->topKeys(10);

        $this->assertSame('local:100', $keys[0]);
        $this->assertContains('sepa:200', $keys);
    }

    public function test_record_ignores_invalid_source_or_item_id(): void
    {
        Cache::flush();
        $service = new RecentItemUsageService();

        $service->record(99, 'invalid', 1);
        $service->record(99, 'local', 0);

        $this->assertSame([], $service->topKeys(99));
    }
}
