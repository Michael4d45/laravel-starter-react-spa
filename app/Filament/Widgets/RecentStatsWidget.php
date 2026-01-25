<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class RecentStatsWidget extends BaseWidget
{
    protected string|null $heading = 'Recent Stats';

    protected null|string $pollingInterval = '60s';

    protected function getStats(): array
    {
        return [
            Stat::make('Total Users', User::count())->icon('heroicon-o-users'),
            Stat::make(
                'Users This Week',
                User::where('created_at', '>', now()->subDays(7))->count(),
            )->icon('heroicon-o-user-plus'),
        ];
    }
}
