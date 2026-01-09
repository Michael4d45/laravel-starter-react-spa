<?php

use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Real-time test endpoint
    Route::post(
        'trigger-test-event',
        App\Actions\Realtime\TriggerTestEvent::class,
    )->name('api.trigger-test-event');
});

// Content routes (no auth required for demo)
Route::get('content', App\Actions\Content\ShowContent::class)->name(
    'api.content',
);

require __DIR__ . '/auth.php';
