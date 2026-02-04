<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request) {
        $request->validate(['email' => 'required|email', 'password' => 'required']);
        
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }
        
        $user = User::where('email', $request->email)->with('businesses')->first();
        $user->tokens()->where('name', 'front')->delete();
        $token = $user->createToken('front', ['front'])->plainTextToken;
        
        return response()->json([
            'success' => true,
            'data' => [
                'user_name' => $user->name, 
                'token' => $token,
                'session_idle_minutes' => config('sanctum.frontend_idle_minutes', 60),
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
