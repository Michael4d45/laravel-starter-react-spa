<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::middleware([
    'web',
    'auth:sanctum',
])->group(function () {
    Route::get('content', \App\Actions\Content\ShowContent::class);
});

require __DIR__ . '/auth.php';
