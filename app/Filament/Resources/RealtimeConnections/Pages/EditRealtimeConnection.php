<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections\Pages;

use App\Filament\Resources\RealtimeConnections\RealtimeConnectionResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditRealtimeConnection extends EditRecord
{
    protected static string $resource = RealtimeConnectionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
