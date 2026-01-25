<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Password reset endpoints with rate limiting to prevent abuse
Route::middleware('throttle:5,1')->group(function () {
    Route::post(
        'send-password-reset-link',
        \App\Actions\Auth\SendPasswordResetLink::class,
    );
    Route::post('reset-password', \App\Actions\Auth\ResetPassword::class);
});

Route::middleware([
    'web',
    'auth:sanctum',
])->group(function () {
    Route::get('user', \App\Actions\Auth\ShowUser::class);
    Route::post('logout', \App\Actions\Auth\Logout::class);
    Route::post('confirm-password', \App\Actions\Auth\ConfirmPassword::class);
    Route::post('update-password', \App\Actions\Auth\UpdatePassword::class);
    Route::post('disconnect-google', \App\Actions\Auth\DisconnectGoogle::class);
    Route::post(
        'send-email-verification-notification',
        \App\Actions\Auth\SendEmailVerificationNotification::class,
    );

    // Broadcasting authentication (private/presence)
    Route::post(
        'broadcasting/auth',
        App\Actions\Broadcasting\AuthenticateBroadcasting::class,
    );
});
