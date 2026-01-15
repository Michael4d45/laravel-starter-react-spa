<?php

use App\Http\Middleware\RefreshSanctumToken;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    RefreshSanctumToken::class,
])->group(function () {
    // Real-time test endpoint
    Route::post(
        'trigger-test-event',
        App\Actions\Realtime\TriggerTestEvent::class,
    );
});

// Content routes (no auth required for demo)
Route::get('content', App\Actions\Content\ShowContent::class);

require __DIR__ . '/auth.php';
