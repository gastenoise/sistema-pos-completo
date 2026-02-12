<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);

        $email = Str::lower((string) $request->input('email'));
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

        if (!Auth::attempt($request->only('email', 'password'))) {
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

        RateLimiter::clear($throttleKey);

        $user = User::where('email', $request->email)->with('businesses')->first();
        $user->tokens()->where('name', 'front')->delete();
        $idleMinutes = (int) config('sanctum.frontend_idle_minutes', 60);
        $tokenExpiration = $idleMinutes > 0
            ? Carbon::now()->addMinutes($idleMinutes)
            : null;

        $token = $user->createToken('front', ['front'], $tokenExpiration)->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user_name' => $user->name,
                'token' => $token,
                'session_idle_minutes' => $idleMinutes,
            ]
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
            // No validar contraseña aquí
        ]);

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
