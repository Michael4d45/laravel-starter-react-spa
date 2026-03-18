<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'throttle:5,1'])->group(function (): void {
    require base_path('app/Features/Auth/password-reset-routes.php');
});

Route::middleware(['web'])->group(function (): void {
    require base_path('app/Features/Content/routes.php');
});

Route::middleware([
    'web',
    'auth:sanctum',
])->group(function (): void {
    require base_path('app/Features/Auth/routes.php');
    require base_path('app/Features/Broadcasting/routes.php');
});
