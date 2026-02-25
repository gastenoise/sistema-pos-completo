<?php

namespace App\Http\Controllers;

use App\Actions\CashRegister\CloseCashRegisterAction;
use App\Actions\CashRegister\OpenCashRegisterAction;
use App\Http\Resources\CashRegisterSessionResource;
use App\Models\CashRegisterSession;
use App\Models\PaymentMethod;
use App\Models\SalePayment;
use App\Services\Authorization\BusinessPermissionResolver;
use App\Services\BusinessContext;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashRegisterController extends Controller
{
    public function __construct(
        private readonly BusinessContext $businessContext,
        private readonly BusinessPermissionResolver $permissionResolver,
    ) {}

    public function status()
    {
        if ($response = $this->denyUnlessHasPermission(
            PermissionCatalog::CASH_REGISTER_VIEW,
            'No tienes permisos para consultar el estado de caja.',
            'CASH_REGISTER_VIEW_FORBIDDEN'
        )) {
            return $response;
        }

        $session = CashRegisterSession::where('status', 'open')
            ->where('opened_by', Auth::id())
            ->with('opener')
            ->latest()
            ->first();

        return response()->json([
            'success' => true,
            'data' => new CashRegisterSessionResource($session)
        ]);
    }

    public function open(Request $request, OpenCashRegisterAction $openCashRegisterAction)
    {
        if ($response = $this->denyUnlessHasPermission(
            PermissionCatalog::CASH_REGISTER_OPEN,
            'No tienes permisos para abrir la caja.',
            'CASH_REGISTER_OPEN_FORBIDDEN'
        )) {
            return $response;
        }

        $validated = $request->validate(['amount' => 'required|numeric|min:0']);

        $session = $openCashRegisterAction->execute(Auth::id(), (float) $validated['amount']);

        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Cash register already open'], 400);
        }

        return response()->json(['success' => true, 'data' => $session]);
    }

    public function getExpectedTotals($sessionId)
    {
        if ($response = $this->denyUnlessHasPermission(
            PermissionCatalog::CASH_REGISTER_VIEW,
            'No tienes permisos para consultar los totales esperados de caja.',
            'CASH_REGISTER_VIEW_FORBIDDEN'
        )) {
            return $response;
        }

        $session = CashRegisterSession::findOrFail($sessionId);

        $totals = SalePayment::query()
            ->whereHas('sale', function ($query) use ($session) {
                $query->where('cash_register_session_id', $session->id)
                    ->where('status', 'closed');
            })
            ->selectRaw('payment_method_id, sum(amount) as total')
            ->groupBy('payment_method_id')
            ->with('paymentMethod')
            ->get();

        $paymentTotals = $totals->mapWithKeys(function ($total) {
            return [
                $total->paymentMethod?->code ?? $total->payment_method_id => (float) $total->total
            ];
        });

        $cashMethod = PaymentMethod::where('code', 'cash')->first();
        $cashTotal = 0.0;
        if ($cashMethod) {
            $cashTotal = (float) ($totals->firstWhere('payment_method_id', $cashMethod->id)?->total ?? 0);
        }

        $salesCount = $session->closedSales()->count();
        $totalSales = $session->closedSales()->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => (float) $totalSales,
                'sales_count' => $salesCount,
                'payment_totals' => $paymentTotals,
                'cash_sales' => $cashTotal,
                'expected_cash' => (float) ($session->opening_cash_amount + $cashTotal),
                'breakdown' => $totals,
            ]
        ]);
    }

    public function close(Request $request, CloseCashRegisterAction $closeCashRegisterAction)
    {
        if ($response = $this->denyUnlessHasPermission(
            PermissionCatalog::CASH_REGISTER_CLOSE,
            'No tienes permisos para cerrar la caja.',
            'CASH_REGISTER_CLOSE_FORBIDDEN'
        )) {
            return $response;
        }

        $validated = $request->validate([
            'real_cash' => 'required|numeric|min:0',
        ]);

        $user = Auth::user();
        $session = CashRegisterSession::where('status', 'open')
            ->where('opened_by', $user->id)
            ->firstOrFail();

        try {
            $closeCashRegisterAction->execute($session, $user->id, (float) $validated['real_cash']);
            return response()->json(['success' => true, 'message' => 'Cash register closed successfully']);
        } catch (\Throwable $exception) {
            return response()->json(['error' => $exception->getMessage()], 500);
        }
    }

    public function closedSessions(Request $request)
    {
        if ($response = $this->denyUnlessHasPermission(
            PermissionCatalog::CASH_REGISTER_VIEW,
            'No tienes permisos para consultar los cierres de caja.',
            'CASH_REGISTER_VIEW_FORBIDDEN'
        )) {
            return $response;
        }

        $businessId = app(BusinessContext::class)->getBusinessId();

        $sessions = CashRegisterSession::where('status', 'closed')
            ->where('business_id', $businessId)
            ->with([
                'opener',
                'closures.creator',
                'expectedTotals.paymentMethod',
                'sales'
            ])
            ->orderByDesc('closed_at')
            ->paginate(20);

        $sessions->getCollection()->transform(function (CashRegisterSession $session) {
            $session->total_sales = (float) $session->closedSales()->sum('total_amount');

            $latestClosure = $session->closures->sortByDesc('created_at')->first();
            $session->real_cash = (float) ($latestClosure?->real_cash ?? 0);
            $session->cash_difference = (float) ($latestClosure?->difference ?? 0);

            return $session;
        });

        return response()->json(['success' => true, 'data' => $sessions]);
    }

    private function denyUnlessHasPermission(string $permissionKey, string $message, string $code): ?JsonResponse
    {
        $businessId = $this->businessContext->getBusinessId();
        $user = Auth::user();

        if (!$businessId || !$user) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo validar el contexto de autorización para esta acción.',
                'code' => 'AUTHORIZATION_CONTEXT_REQUIRED',
            ], 403);
        }

        $this->permissionResolver->resolve($user, $businessId);

        if ($this->permissionResolver->can($permissionKey)) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'code' => $code,
        ], 403);
    }
}
