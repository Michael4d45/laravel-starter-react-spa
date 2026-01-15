<?php

use App\Http\Middleware\RefreshSanctumToken;
use Illuminate\Support\Facades\Route;

Route::get('token', \App\Actions\Auth\CreateToken::class)->middleware('web');

// Retrieve OAuth token after successful callback (Stateless handoff via HttpOnly cookie)
Route::get('oauth-token', \App\Actions\Auth\GetOAuthToken::class)->middleware([
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
]);

// Login and register are now purely token-based and don't create web sessions
Route::post('login', \App\Actions\Auth\Login::class);
Route::post('register', \App\Actions\Auth\Register::class);

// Password reset endpoints with rate limiting to prevent abuse
Route::middleware('throttle:5,1')->group(function () {
    Route::post(
        'send-password-reset-link',
        \App\Actions\Auth\SendPasswordResetLink::class,
    );
    Route::post('reset-password', \App\Actions\Auth\ResetPassword::class);
});

Route::middleware([
    RefreshSanctumToken::class,
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

    // Token management endpoints
    Route::get('tokens', App\Actions\Auth\ListTokens::class);
    Route::delete('tokens/{tokenId}', App\Actions\Auth\DeleteToken::class);
});
