<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class RealtimeConnectionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('id')
                ->label('ID')
                ->disabled()
                ->helperText('UUID of the connection'),

            TextInput::make('socket_id')
                ->label('Socket ID')
                ->required()
                ->disabled(),

            Select::make('user_id')
                ->relationship('user', 'name')
                ->searchable()
                ->preload()
                ->required(),

            TextInput::make('channel_name')->required(),

            TextInput::make('ip_address')->label('IP Address'),

            KeyValue::make('user_agent')->columnSpanFull(),

            DateTimePicker::make('connected_at')->required(),

            DateTimePicker::make('disconnected_at'),

            DateTimePicker::make('created_at')->disabled(),

            DateTimePicker::make('updated_at')->disabled(),
        ]);
    }
}
