<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get('content', \App\Actions\Content\ShowContent::class);

Route::middleware([
    'web',
    'auth:sanctum',
])->group(function () {
    //
});

require __DIR__ . '/auth.php';
