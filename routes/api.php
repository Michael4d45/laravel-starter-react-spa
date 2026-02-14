<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::middleware([
    'web',
    'auth:sanctum',
])->group(function () {
    // Authenticated routes for user-specific data and actions
});

Route::middleware(['web'])->group(function () {
    // Routes that allow unauthenticated access for public data
    Route::get('content', \App\Actions\Content\ShowContent::class);
});

require __DIR__ . '/auth.php';
