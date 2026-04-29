<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'allowed_login_ip',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $visible = [
        'id',
        'name',
        'email',
        'phone',
        'allowed_login_ip',
        'email_verified_at',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Negocios a los que pertenece el usuario.
     */
    public function businesses(): BelongsToMany
    {
        return $this->belongsToMany(Business::class, 'business_users')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /**
     * Sesiones de caja abiertas por este usuario.
     */
    public function cashSessions(): HasMany
    {
        return $this->hasMany(CashRegisterSession::class, 'opened_by');
    }

    /**
     * Ventas realizadas por el usuario.
     */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * Helper para verificar si el usuario tiene un rol específico en el negocio actual.
     */
    public function hasRole(string $role, int $businessId): bool
    {
        return $this->businesses()
            ->where('business_id', $businessId)
            ->where('role', $role)
            ->exists();
    }
}
