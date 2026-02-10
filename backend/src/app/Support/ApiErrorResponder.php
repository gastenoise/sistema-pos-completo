<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

trait ApiErrorResponder
{
    protected function respondWithError(
        Request $request,
        string $clientMessage = 'Error interno, intente nuevamente.',
        int $status = 500,
        ?Throwable $exception = null,
        array $context = []
    ): JsonResponse {
        $requestId = $this->resolveRequestId($request);

        if ($exception) {
            Log::error('API request failed', array_merge($context, [
                'request_id' => $requestId,
                'path' => $request->path(),
                'exception_class' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]));
        }

        return response()->json([
            'success' => false,
            'message' => $clientMessage,
            'request_id' => $requestId,
        ], $status);
    }

    private function resolveRequestId(Request $request): string
    {
        return (string) ($request->attributes->get('request_id')
            ?? $request->header('X-Request-Id')
            ?? $request->header('X-Correlation-Id')
            ?? Str::uuid());
    }
}
