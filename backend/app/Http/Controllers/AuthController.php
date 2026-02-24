<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);

        $email = Str::lower((string) $request->input('email'));
        $password = (string) $request->input('password');
        $throttleKey = sprintf('login-failed:%s|%s', $request->ip(), $email);
        $failedAttempts = RateLimiter::attempts($throttleKey);

        if (RateLimiter::tooManyAttempts($throttleKey, 1)) {
            $retryAfter = RateLimiter::availableIn($throttleKey);

            Log::warning('Auth login blocked by progressive backoff', [
                'event' => 'auth.login.locked',
                'ip' => $request->ip(),
                'email_hash' => hash('sha256', $email),
                'retry_after_seconds' => $retryAfter,
                'failed_attempts' => $failedAttempts,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Demasiados intentos. Intenta nuevamente más tarde.',
            ], 429);
        }

        if (!Auth::attempt(['email' => $email, 'password' => $password], true)) {
            $currentAttempt = $failedAttempts + 1;
            $decaySeconds = min(300, 5 * (2 ** max(0, $currentAttempt - 1)));

            RateLimiter::hit($throttleKey, $decaySeconds);

            Log::warning('Auth login failed', [
                'event' => 'auth.login.failed',
                'ip' => $request->ip(),
                'email_hash' => hash('sha256', $email),
                'failed_attempts' => $currentAttempt,
                'backoff_seconds' => $decaySeconds,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Demasiados intentos. Intenta nuevamente más tarde.',
            ], 429);
        }

        $user = User::with('businesses')->findOrFail(Auth::id());
        $allowedLoginIp = is_string($user->allowed_login_ip)
            ? trim($user->allowed_login_ip)
            : $user->allowed_login_ip;

        if (!empty($allowedLoginIp) && $request->ip() !== $allowedLoginIp) {
            Log::warning('Auth login blocked by IP restriction', [
                'event' => 'auth.login.ip_not_allowed',
                'user_id' => $user->id,
                'request_ip_hash' => hash('sha256', (string) $request->ip()),
                'allowed_ip_hash' => hash('sha256', (string) $allowedLoginIp),
            ]);

            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'success' => false,
                'code' => 'auth.ip_not_allowed',
                'message' => 'El acceso desde esta red no está permitido para tu cuenta.',
            ], 403);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        // Revoca tokens legacy para forzar migración a sesión + cookie HttpOnly.
        $user->tokens()->delete();

        // Opcional: cerrar otras sesiones si la tabla de sesiones está disponible.
        if ((bool) config('sanctum.invalidate_other_sessions_on_login', true)
            && config('session.driver') === 'database') {
            try {
                DB::table(config('session.table', 'sessions'))
                    ->where('user_id', $user->id)
                    ->where('id', '!=', $request->session()->getId())
                    ->delete();
            } catch (\Throwable $exception) {
                Log::warning('Unable to invalidate previous sessions after login', [
                    'event' => 'auth.login.invalidate_sessions_failed',
                    'user_id' => $user->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user_name' => $user->name,
                'session_idle_minutes' => (int) config('session.lifetime', 120),
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->tokens()->delete();
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Devuelve la información del usuario autenticado.
     */
    public function me(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Not authenticated'], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
            ]
        ]);
    }

    /**
     * Permite actualizar los datos del usuario autenticado (name, phone, password).
     * El email NO se modifica aquí.
     */
    public function updateMe(Request $request)
    {
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Not authenticated'], 401);
        }

        // La contraseña no se puede modificar aquí
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:30',
            'allowed_login_ip' => 'sometimes|nullable|ip',
            // No validar contraseña aquí
        ]);

        if (array_key_exists('allowed_login_ip', $validated)) {
            $allowedLoginIp = is_string($validated['allowed_login_ip'])
                ? trim($validated['allowed_login_ip'])
                : $validated['allowed_login_ip'];

            $validated['allowed_login_ip'] = blank($allowedLoginIp)
                ? null
                : $allowedLoginIp;
        }

        $user = User::findOrFail($authUser->id);

        // No permitir modificar la contraseña desde este método
        unset($validated['password']);

        $user->fill($validated);
        $user->save();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user->refresh(),
            ]
        ]);
    }

    /**
     * Permite cambiar la contraseña de usuario autenticado.
     * Requiere contraseña actual, nueva contraseña y confirmación de la nueva contraseña.
     */
    public function changePassword(Request $request)
    {
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Not authenticated'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        // Busca el modelo User real del usuario autenticado
        $user = User::findOrFail($authUser->id);

        // Verifica que la contraseña actual coincide
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['success' => false, 'message' => 'La contraseña actual no es correcta'], 400);
        }

        // Cambia la contraseña usando el modelo User
        $user->password = Hash::make($validated['new_password']);
        $user->save();

        return response()->json(['success' => true, 'message' => 'Contraseña actualizada correctamente']);
    }

    /**
     * Permite actualizar el email del usuario autenticado.
     */
    public function changeEmail(Request $request)
    {
        $authUser = Auth::user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Not authenticated'], 401);
        }

        $validated = $request->validate([
            'email' => 'required|email|max:255|unique:users,email,' . $authUser->id,
        ]);

        $user = User::findOrFail($authUser->id);

        $user->email = $validated['email'];
        $user->save();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user->refresh(),
            ]
        ]);
    }
}
