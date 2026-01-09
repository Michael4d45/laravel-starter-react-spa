<?php

declare(strict_types=1);

namespace App\Actions\Broadcasting;

use App\Models\RealtimeConnection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TrackConnection
{
    /**
     * Track a new realtime connection
     */
    public function connect(
        string $socketId,
        string $userId,
        string $channelName,
        Request $request,
    ): void {
        try {
            // Check if connection already exists
            $existingConnection = RealtimeConnection::where(
                'socket_id',
                $socketId,
            )->first();

            if ($existingConnection) {
                if ($existingConnection->disconnected_at === null) {
                    // Connection already exists and is active, skip creating duplicate
                    Log::info('Realtime connection already exists and is active', [
                        'socket_id' => $socketId,
                        'user_id' => $userId,
                        'channel_name' => $channelName,
                    ]);
                    return;
                } else {
                    // Connection exists but was disconnected, reactivate it
                    $existingConnection->update([
                        'user_id' => $userId,
                        'channel_name' => $channelName,
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'connected_at' => now(),
                        'disconnected_at' => null,
                    ]);

                    Log::info('Realtime connection reactivated', [
                        'socket_id' => $socketId,
                        'user_id' => $userId,
                        'channel_name' => $channelName,
                    ]);
                    return;
                }
            }

            // Create new connection
            RealtimeConnection::create([
                'socket_id' => $socketId,
                'user_id' => $userId,
                'channel_name' => $channelName,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'connected_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to track realtime connection', [
                'socket_id' => $socketId,
                'user_id' => $userId,
                'channel_name' => $channelName,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Track a disconnected realtime connection
     */
    public function disconnect(string $socketId): void
    {
        try {
            $connection = RealtimeConnection::where('socket_id', $socketId)
                ->whereNull('disconnected_at')
                ->first();

            if ($connection) {
                $connection->update(['disconnected_at' => now()]);

                Log::info('Realtime connection closed', [
                    'socket_id' => $socketId,
                    'user_id' => $connection->user_id,
                    'channel' => $connection->channel_name,
                    'connected_duration' =>
                        $connection->connected_at->diffInSeconds(now()) . 's',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to track realtime disconnection', [
                'socket_id' => $socketId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get count of currently active connections
     */
    public function getActiveConnectionCount(): int
    {
        return RealtimeConnection::whereNull('disconnected_at')->count();
    }

    /**
     * Get active connections by channel
     *
     * @return array<string, int>
     */
    public function getActiveConnectionsByChannel(): array
    {
        $results = RealtimeConnection::whereNull('disconnected_at')
            ->selectRaw('channel_name, COUNT(*) as count')
            ->groupBy('channel_name')
            ->get();

        $connections = [];
        foreach ($results as $result) {
            $count = $result->getAttribute('count');
            $connections[$result->channel_name] = is_numeric($count)
                ? (int) $count
                : 0;
        }

        return $connections;
    }

    /**
     * Clean up old disconnected connections (older than 24 hours)
     */
    public function cleanupOldConnections(): int
    {
        $result = RealtimeConnection::where(
            'disconnected_at',
            '<',
            now()->subDay(),
        )->delete();

        return is_int($result) ? $result : 0;
    }
}
