<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections\Pages;

use App\Filament\Resources\RealtimeConnections\RealtimeConnectionResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListRealtimeConnections extends ListRecords
{
    protected static string $resource = RealtimeConnectionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
