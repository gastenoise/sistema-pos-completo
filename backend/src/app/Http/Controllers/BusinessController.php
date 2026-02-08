<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\BusinessUser;
use App\Models\User;
use App\Models\Business;
use App\Models\BusinessSmtpSetting;
use App\Services\BusinessContext;
use Illuminate\Support\Facades\Mail;

class BusinessController extends Controller
{
    /**
     * Devuelve los negocios asociados al usuario autenticado.
     */
    public function index(Request $request)
    {
        // Usar el modelo User directamente para obtener el usuario autenticado
        $user = User::find(Auth::id());

        // Carga los negocios con el rol asociado en la pivot table
        $businesses = $user->businesses()->withPivot('role')->get();

        return response()->json([
            'data' => $businesses
        ]);
    }

    public function select(Request $request)
    {
        $request->validate(['business_id' => 'required|integer']);
        $user = Auth::user();
        
        $exists = BusinessUser::where('user_id', $user->id)
            ->where('business_id', $request->business_id)
            ->exists();
            
        if (!$exists) {
            return response()->json(['success' => false, 'message' => 'Unauthorized access to business'], 403);
        }
        
        // En arquitectura stateless API real, el cliente debe guardar este ID
        // y enviarlo en el header X-Business-Id en subsiguientes requests.
        // Pero podemos guardarlo en session si usamos stateful Sanctum.
        
        // session(['current_business_id' => $request->business_id]);
        
        return response()->json(['success' => true, 'message' => 'Context switched']);
    }

    /**
     * GET /protected/business/smtp
     * Devuelve la configuración SMTP del negocio seleccionado.
     */
    public function getSmtpSettings(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $smtp = $business->smtpSettings;
        if (!$smtp) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => $smtp]);
    }

    /**
     * PUT /protected/business/smtp
     * Actualiza la configuración SMTP del negocio seleccionado.
     */
    public function updateSmtpSettings(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $validated = $request->validate([
            'host' => 'nullable|string',
            'port' => 'nullable|integer',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'encryption' => 'nullable|string|in:none,ssl,tls',
            'from_email' => 'nullable|email',
            'from_name' => 'nullable|string',
            'active' => 'nullable|boolean',
        ]);

        // Asegura que el registro exista o lo crea si no
        /** @var \App\Models\BusinessSmtpSetting $smtp */
        $smtp = $business->smtpSettings ?: new BusinessSmtpSetting(['business_id' => $business->id]);
        $smtp->fill($validated);

        // Si el password es NULL, no se actualiza.
        if (!$request->has('password') || $request->password === null || $request->password === '') {
            unset($smtp->password);
        }

        $smtp->business_id = $business->id;
        $smtp->save();

        return response()->json([
            'success' => true,
            'data' => $smtp->fresh()
        ]);
    }

    /**
     * POST /protected/business/smtp/test
     * Envía un email de prueba usando la configuración SMTP del negocio seleccionado.
     */
    public function testSmtpSettings(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $validated = $request->validate([
            'host' => 'nullable|string',
            'port' => 'nullable|integer',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'encryption' => 'nullable|string|in:none,ssl,tls',
            'from_email' => 'nullable|email',
            'from_name' => 'nullable|string',
            'to_email' => 'nullable|email',
        ]);

        $smtp = $business->smtpSettings;
        if (!$smtp && empty($validated)) {
            return response()->json(['success' => false, 'message' => 'SMTP configuration not found'], 404);
        }

        $config = [
            'host' => $validated['host'] ?? $smtp?->host,
            'port' => $validated['port'] ?? $smtp?->port,
            'username' => $validated['username'] ?? $smtp?->username,
            'password' => $validated['password'] ?? $smtp?->password,
            'encryption' => $validated['encryption'] ?? $smtp?->encryption,
            'from_email' => $validated['from_email'] ?? $smtp?->from_email,
            'from_name' => $validated['from_name'] ?? $smtp?->from_name,
        ];

        $toEmail = $validated['to_email'] ?? Auth::user()?->email;
        if (!$toEmail) {
            return response()->json(['success' => false, 'message' => 'Recipient email is required'], 422);
        }

        if (!$config['host'] || !$config['port'] || !$config['from_email']) {
            return response()->json(['success' => false, 'message' => 'Incomplete SMTP configuration'], 422);
        }

        $scheme = match ($config['encryption']) {
            'ssl' => 'smtps',
            default => 'smtp',
        };

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $config['host'],
            'mail.mailers.smtp.port' => (int) $config['port'],
            'mail.mailers.smtp.username' => $config['username'],
            'mail.mailers.smtp.password' => $config['password'],
            'mail.mailers.smtp.scheme' => $scheme,
            'mail.from.address' => $config['from_email'],
            'mail.from.name' => $config['from_name'] ?: $business->name,
        ]);

        try {
            Mail::mailer('smtp')->raw(
                'Prueba de configuración SMTP. Si recibís este email, la configuración funciona.',
                function ($message) use ($toEmail) {
                    $message->to($toEmail)->subject('Prueba SMTP');
                }
            );
        } catch (\Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => 'SMTP test failed',
                'error' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'SMTP test sent successfully',
        ]);
    }

    /**
     * PUT /protected/business
     * Actualiza datos básicos del negocio seleccionado.
     */
    public function update(Request $request)
    {
        $businessId = app(BusinessContext::class)->getBusinessId();
        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Business not selected'], 403);
        }

        $business = Business::find($businessId);
        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'currency' => 'nullable|string|in:ARS,USD',
            'tax_id' => 'nullable|string|max:20',
            'preferred_payment_method_id' => 'nullable|integer|exists:payment_methods,id',
        ]);

        $business->fill($validated);
        $business->save();

        return response()->json([
            'success' => true,
            'data' => $business->fresh()
        ]);
    }
}
