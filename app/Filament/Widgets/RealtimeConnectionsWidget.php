<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Actions\Broadcasting\TrackConnection;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class RealtimeConnectionsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $tracker = app(TrackConnection::class);
        $totalUsers = User::count();
        $activeConnections = $tracker->getActiveConnectionCount();

        return [
            Stat::make('Total Users', $totalUsers)
                ->description('Registered users in the system')
                ->descriptionIcon('heroicon-m-users'),

            Stat::make('Active Connections', $activeConnections)
                ->description('Currently connected to realtime events')
                ->descriptionIcon('heroicon-m-wifi')
                ->color($activeConnections > 0 ? 'success' : 'gray'),

            Stat::make(
                'Connection Rate',
                $totalUsers > 0
                    ? round(($activeConnections / $totalUsers) * 100, 1) . '%'
                    : '0%',
            )
                ->description('Percentage of users currently connected')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color($activeConnections > 0 ? 'info' : 'gray'),
        ];
    }
}
