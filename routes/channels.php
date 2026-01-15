<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (
    User $user,
    string $id,
): bool {
    return (string) $user->id === (string) $id;
});

Broadcast::channel('online', function (User $user): array {
    return [
        'id' => (string) $user->id,
        'name' => $user->name ?? 'Unknown user',
    ];
});
