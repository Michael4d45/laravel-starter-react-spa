<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Realtime connection model
 *
 * @property string $id
 * @property string $socket_id
 * @property string $user_id
 * @property string $channel_name
 * @property string|null $ip_address
 * @property array<string, string>|null $user_agent
 * @property Carbon $connected_at
 * @property Carbon|null $disconnected_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 */
class RealtimeConnection extends Model
{
    use HasUuids;

    protected $fillable = [
        'socket_id',
        'user_id',
        'channel_name',
        'ip_address',
        'user_agent',
        'connected_at',
        'disconnected_at',
    ];

    protected $casts = [
        'user_agent' => 'array',
        'connected_at' => 'datetime',
        'disconnected_at' => 'datetime',
    ];

    /**
     * Get the user that owns the connection
     *
     * @return BelongsTo<User,$this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for active connections
     *
     * @param Builder<RealtimeConnection> $query
     * @return Builder<RealtimeConnection>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('disconnected_at');
    }

    /**
     * Scope for connections by channel
     *
     * @param Builder<RealtimeConnection> $query
     * @return Builder<RealtimeConnection>
     */
    public function scopeByChannel(Builder $query, string $channelName): Builder
    {
        return $query->where('channel_name', $channelName);
    }
}
