<?php

declare(strict_types=1);

namespace App\Filament\Resources\Users\Schemas;

use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Flex;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->maxLength(255),

            TextInput::make('email')
                ->email()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            DateTimePicker::make('email_verified_at'),

            TextInput::make('password')
                ->password()
                ->dehydrateStateUsing(fn($state) => filled($state)
                    ? bcrypt(
                        is_string($state)
                            ? $state
                            : (string) (is_scalar($state) ? $state : ''),
                    )
                    : null)
                ->dehydrated(filled(...))
                ->required(fn(string $context): bool => $context === 'create')
                ->minLength(8),

            Checkbox::make('is_admin')->label('Administrator'),
            Checkbox::make('is_guest')->label('Guest'),
            TextInput::make('google_id')->disabled(),
            TextInput::make('verified_google_email')->email()->disabled(),

            Flex::make([
                TextInput::make('id')->copyable()->disabled(),
                DateTimePicker::make('created_at')->disabled(),
                DateTimePicker::make('updated_at')->disabled(),
                DateTimePicker::make('deleted_at')->disabled(),
            ])->columnSpanFull()->hiddenOn('create'),
        ]);
    }
}
