<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections;

use App\Filament\Resources\RealtimeConnections\Pages\CreateRealtimeConnection;
use App\Filament\Resources\RealtimeConnections\Pages\EditRealtimeConnection;
use App\Filament\Resources\RealtimeConnections\Pages\ListRealtimeConnections;
use App\Filament\Resources\RealtimeConnections\Schemas\RealtimeConnectionForm;
use App\Filament\Resources\RealtimeConnections\Tables\RealtimeConnectionsTable;
use App\Models\RealtimeConnection;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class RealtimeConnectionResource extends Resource
{
    protected static string|null $model = RealtimeConnection::class;

    protected static \BackedEnum|string|null $navigationIcon =
        Heroicon::OutlinedWifi;

    protected static string|\UnitEnum|null $navigationGroup = 'System';

    public static function form(Schema $schema): Schema
    {
        return RealtimeConnectionForm::configure($schema);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListRealtimeConnections::route('/'),
            'create' => CreateRealtimeConnection::route('/create'),
            'edit' => EditRealtimeConnection::route('/{record}/edit'),
        ];
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function table(Table $table): Table
    {
        return RealtimeConnectionsTable::configure($table);
    }
}
