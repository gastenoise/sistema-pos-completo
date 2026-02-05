<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Business extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'currency',
        'tax_id',
        'preferred_payment_method_id',
    ];

    /**
     * Relación con usuarios a través de la tabla pivot con roles.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'business_users')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function hiddenPaymentMethods()
    {
        return $this->hasMany(BusinessPaymentMethodHide::class);
    }

    /**
     * Obtener IDs de métodos ocultos (cacheable).
     */
    public function hiddenPaymentMethodIds()
    {
        return $this->hiddenPaymentMethods()->pluck('payment_method_id')->toArray();
    }

    public function smtpSettings()
    {
        return $this->hasOne(BusinessSmtpSetting::class);
    }

    /**
     * Asociación con cuentas bancarias (relación muchos a muchos).
     */
    public function bankAccount(): HasOne
    {
        return $this->hasOne(BankAccount::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function preferredPaymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class, 'preferred_payment_method_id');
    }
}
