<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Services\BusinessContext;
use App\Services\SaleTicketPdfService;
use App\Services\SaleTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SaleTicketController extends Controller
{
    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly SaleTicketService $saleTicketService,
        private readonly SaleTicketPdfService $saleTicketPdfService,
    ) {}

    public function show(Sale $sale): JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $this->saleTicketService->build($sale),
        ]);
    }

    public function pdf(Request $request, Sale $sale): Response|JsonResponse
    {
        if ($response = $this->validateBusinessAccess($sale)) {
            return $response;
        }

        return $this->saleTicketPdfService->render(
            sale: $sale,
            download: $request->boolean('download'),
        );
    }

    private function validateBusinessAccess(Sale $sale): ?JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();

        if (is_null($businessId) || (int) $sale->business_id !== (int) $businessId) {
            return response()->json([
                'success' => false,
                'message' => 'Sale does not belong to the current business context.',
            ], 403);
        }

        return null;
    }
}
