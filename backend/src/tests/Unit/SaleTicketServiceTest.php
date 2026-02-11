<?php

namespace Tests\Unit;

use App\Models\Business;
use App\Models\CashRegisterSession;
use App\Models\Sale;
use App\Models\User;
use App\Services\SaleTicketService;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class SaleTicketServiceTest extends TestCase
{
    public function test_build_handles_string_dates_without_crashing(): void
    {
        $sale = new Sale([
            'id' => 1,
            'status' => 'completed',
            'business_id' => 1,
            'created_at' => '2026-02-11 20:57:51',
            'closed_at' => '2026-02-11 20:58:00',
            'total_amount' => '1500.50',
        ]);

        $sale->setRelation('items', new Collection());
        $sale->setRelation('payments', new Collection());
        $sale->setRelation('business', new Business(['id' => 1, 'name' => 'Demo Store']));
        $sale->setRelation('user', new User(['id' => 7, 'name' => 'Cajero']));
        $sale->setRelation('cashRegisterSession', new CashRegisterSession([
            'id' => 11,
            'status' => 'open',
            'opened_at' => '2026-02-11 10:00:00',
            'closed_at' => null,
        ]));

        $payload = (new SaleTicketService())->build($sale);

        $this->assertSame(1, $payload['id']);
        $this->assertSame('2026-02-11T17:57:51-03:00', $payload['date']['created_at']);
        $this->assertSame('2026-02-11T17:58:00-03:00', $payload['date']['closed_at']);
        $this->assertSame('2026-02-11T07:00:00-03:00', $payload['cash_register']['opened_at']);
    }
}
