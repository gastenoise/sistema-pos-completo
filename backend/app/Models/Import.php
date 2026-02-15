<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBusiness;

class Import extends Model
{
    use HasBusiness;

    protected $fillable = [
        'business_id',
        'user_id',
        'source', // csv, sheets
        'status', // previewed, imported, failed
        'summary' // JSON con conteos de éxito/error
    ];

    protected $casts = [
        'summary' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}