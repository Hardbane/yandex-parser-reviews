<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Organization extends Model
{
    protected $fillable = [
        'user_id',
        'yandex_url',
        'title',
        'rating',
        'ratings_count',
        'reviews_count',
        'parse_status',
        'parse_error',
        'parsed_at',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'parsed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
