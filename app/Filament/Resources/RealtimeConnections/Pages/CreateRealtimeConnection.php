<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections\Pages;

use App\Filament\Resources\RealtimeConnections\RealtimeConnectionResource;
use Filament\Resources\Pages\CreateRecord;

class CreateRealtimeConnection extends CreateRecord
{
    protected static string $resource = RealtimeConnectionResource::class;
}
