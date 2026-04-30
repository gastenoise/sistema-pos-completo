<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Schema;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
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

    public function sepaItemBusinessPrices(): HasMany
    {
        return $this->hasMany(SepaItemBusinessPrice::class);
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


    public function parameters(): HasMany
    {
        return $this->hasMany(BusinessParameter::class);
    }

    public function getBusinessParametersMapAttribute(): array
    {
        if (!Schema::hasTable('business_parameters')) {
            return [];
        }

        $parameters = $this->relationLoaded('parameters')
            ? $this->parameters
            : $this->parameters()->get();

        return $parameters
            ->pluck('parameter_id')
            ->unique()
            ->mapWithKeys(fn ($parameterId) => [$parameterId => true])
            ->all();
    }


    public function rolePermissions(): HasMany
    {
        return $this->hasMany(BusinessRolePermission::class);
    }

    public function preferredPaymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class, 'preferred_payment_method_id');
    }
}
