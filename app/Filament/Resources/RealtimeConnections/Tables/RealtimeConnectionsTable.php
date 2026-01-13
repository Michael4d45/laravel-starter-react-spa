<?php

declare(strict_types=1);

namespace App\Filament\Resources\RealtimeConnections\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class RealtimeConnectionsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('ID')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('socket_id')
                    ->label('Socket')
                    ->searchable()
                    ->toggleable(),

                TextColumn::make('channel_name')
                    ->label('Channel')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('ip_address')
                    ->label('IP')
                    ->searchable()
                    ->toggleable(),

                IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean()
                    ->state(fn($record) => $record->disconnected_at === null),

                TextColumn::make('connected_at')->dateTime()->sortable(),

                TextColumn::make('disconnected_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                TernaryFilter::make('active')
                    ->label('Active Status')
                    ->placeholder('All')
                    ->queries(
                        true: fn($query) => $query->whereNull(
                            'disconnected_at',
                        ),
                        false: fn($query) => $query->whereNotNull(
                            'disconnected_at',
                        ),
                    ),
            ])
            ->recordActions([])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('connected_at', 'desc');
    }
}
