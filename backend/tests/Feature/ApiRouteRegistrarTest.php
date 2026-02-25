<?php

namespace Tests\Feature;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Tests\TestCase;

class ApiRouteRegistrarTest extends TestCase
{
    public function test_protected_and_public_reports_routes_exist_with_expected_middleware(): void
    {
        $protectedSummaryRoute = $this->findRoute('GET', 'protected/reports/summary');
        $publicSummaryRoute = $this->findRoute('GET', 'public/reports/summary');

        $this->assertNotNull($protectedSummaryRoute);
        $this->assertNotNull($publicSummaryRoute);

        $protectedMiddleware = $protectedSummaryRoute->gatherMiddleware();
        $publicMiddleware = $publicSummaryRoute->gatherMiddleware();

        $this->assertContains('web', $protectedMiddleware);
        $this->assertContains('auth:sanctum', $protectedMiddleware);
        $this->assertContains('ensure.token.fresh', $protectedMiddleware);
        $this->assertContains('resolve.business', $protectedMiddleware);

        $this->assertContains('auth.apikey', $publicMiddleware);
        $this->assertContains('throttle:public-api', $publicMiddleware);
        $this->assertNotContains('auth:sanctum', $publicMiddleware);
    }

    public function test_protected_exclusive_routes_are_kept_explicitly_outside_public_prefix(): void
    {
        $protectedClosedSessions = $this->findRoute('GET', 'protected/cash-register/sessions/closed');
        $publicClosedSessions = $this->findRoute('GET', 'public/cash-register/sessions/closed');

        $protectedTicketEmail = $this->findRoute('POST', 'protected/sales/{sale}/ticket/email');
        $publicTicketEmail = $this->findRoute('POST', 'public/sales/{sale}/ticket/email');

        $this->assertNotNull($protectedClosedSessions);
        $this->assertNull($publicClosedSessions);

        $this->assertNotNull($protectedTicketEmail);
        $this->assertNull($publicTicketEmail);
    }

    private function findRoute(string $method, string $uri): ?Route
    {
        return collect(RouteFacade::getRoutes()->getRoutes())->first(function (Route $route) use ($method, $uri): bool {
            return in_array(strtoupper($method), $route->methods(), true)
                && $route->uri() === ltrim($uri, '/');
        });
    }
}
