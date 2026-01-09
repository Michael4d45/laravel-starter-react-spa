<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class MonitorRealtimeConnections extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:monitor-realtime-connections {--watch : Continuously monitor connections}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Monitor active realtime connections and channel subscriptions';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('watch')) {
            $this->monitorContinuously();
            return 0; // This won't be reached due to infinite loop, but added for completeness
        } else {
            $this->showCurrentStatus();
            return 0;
        }
    }

    /**
     * Show current connection status
     */
    private function showCurrentStatus(): void
    {
        $this->info('=== Realtime Connections Monitor ===');
        $this->newLine();

        // Get authenticated users (rough estimate of potential connections)
        $totalUsers = User::count();
        $this->info("Total registered users: {$totalUsers}");

        // Show tracked connections from database
        $this->showTrackedConnections();

        // Check if Redis is available for additional info
        try {
            $redis = Redis::connection();
            $this->info('Redis connection: Available');

            // Try to get Reverb connection info if available
            $reverbConnections = $this->getReverbConnectionCount();
            if ($reverbConnections !== null) {
                $this->info(
                    "Estimated WebSocket connections: {$reverbConnections}",
                );
            }
        } catch (\Exception $e) {
            $this->warn('Redis connection: Not available');
        }

        // Show broadcasting channels info
        $this->showChannelInfo();

        $this->newLine();
        $this->info('To continuously monitor connections, use: --watch');
        $this->info(
            'Note: Each authenticated user with GlobalRealtimeListener creates one private channel connection',
        );
    }

    /**
     * Continuously monitor connections
     */
    private function monitorContinuously(): void
    {
        $this->info(
            'Monitoring realtime connections... (Press Ctrl+C to stop)',
        );

        // Continuous monitoring loop - intentionally runs forever until interrupted
        /** @phpstan-ignore-next-line */
        while (true) {
            $this->clearScreen();
            $this->showCurrentStatus();
            sleep(5); // Update every 5 seconds
        }
    }

    /**
     * Get Reverb connection count (if available)
     */
    private function getReverbConnectionCount(): null|int
    {
        try {
            // Try to get from Redis keys that Reverb might use
            $redis = Redis::connection();

            // Reverb stores connection info in Redis with specific patterns
            $keys = $redis->keys('reverb:*');
            $connectionKeys = array_filter($keys, fn($key) => str_contains(
                $key,
                'connections',
            ));

            return count($connectionKeys);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Show tracked connections from database
     */
    private function showTrackedConnections(): void
    {
        $tracker = app(\App\Actions\Broadcasting\TrackConnection::class);

        $activeCount = $tracker->getActiveConnectionCount();
        $this->info("Active tracked connections: {$activeCount}");

        if ($activeCount > 0) {
            $connectionsByChannel = $tracker->getActiveConnectionsByChannel();

            $this->info('Active connections by channel:');
            foreach ($connectionsByChannel as $channel => $count) {
                $this->line("  • {$channel}: {$count} connections");
            }
        }

        // Clean up old connections
        $cleanedCount = $tracker->cleanupOldConnections();
        if ($cleanedCount > 0) {
            $this->info("Cleaned up {$cleanedCount} old connection records");
        }

        $this->newLine();
    }

    /**
     * Show channel subscription information
     */
    private function showChannelInfo(): void
    {
        $this->info('Channel Information:');
        $this->line(
            '• Private channels: App.Models.User.{id} (one per authenticated user)',
        );
        $this->line('• Authentication: Via /api/broadcasting/auth endpoint');
        $this->line(
            '• Events: TestRealtimeEvent broadcasts to individual users',
        );
        $this->newLine();

        // Show recent broadcast activity if available
        $this->showRecentActivity();
    }

    /**
     * Show recent broadcast activity
     */
    private function showRecentActivity(): void
    {
        try {
            $redis = Redis::connection();

            // Look for broadcast-related keys
            $broadcastKeys = $redis->keys('broadcasting:*');
            if (count($broadcastKeys) > 0) {
                $this->info('Recent broadcast activity detected');
            } else {
                $this->info('No recent broadcast activity');
            }
        } catch (\Exception $e) {
            $this->warn('Cannot check broadcast activity without Redis');
        }
    }

    /**
     * Clear the console screen
     */
    private function clearScreen(): void
    {
        // ANSI escape code to clear screen and move cursor to top
        echo "\e[H\e[J";
    }
}
