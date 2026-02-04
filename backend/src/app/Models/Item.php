<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasBusiness;

class Item extends Model
{
    use HasBusiness;
    protected $guarded = ['id'];
    
    // Scopes locales para filtros
    public function scopeActive($query) { return $query->where('active', true); }
}