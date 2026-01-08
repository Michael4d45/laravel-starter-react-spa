<?php

use App\Actions\Auth\ConfirmPassword;
use App\Actions\Auth\CreateToken;
use App\Actions\Auth\DisconnectGoogle;
use App\Actions\Auth\GetOAuthToken;
use App\Actions\Auth\Login;
use App\Actions\Auth\Logout;
use App\Actions\Auth\Register;
use App\Actions\Auth\ResetPassword;
use App\Actions\Auth\SendEmailVerificationNotification;
use App\Actions\Auth\SendPasswordResetLink;
use App\Actions\Auth\ShowUser;
use App\Actions\Auth\UpdatePassword;
use App\Actions\Auth\VerifyEmail;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

Route::get('/user', ShowUser::class)->middleware('auth:sanctum')->name(
    'api.user',
);

// Create token for already authenticated user (used for OAuth callbacks and session auth)
// Needs web middleware to access session (e.g., when logging in via Filament)
// Action handles auth check and returns JSON 401 for unauthenticated
Route::get('/token', CreateToken::class)->middleware('web')->name('api.token');

// Retrieve OAuth token from session after successful callback (uses session, not bearer token)
Route::get('/oauth-token', GetOAuthToken::class)->middleware('web')->name(
    'api.oauth-token',
);

// Login and register need web middleware to create sessions for Filament
Route::post('/login', Login::class)
    ->middleware('web')
    ->withoutMiddleware(VerifyCsrfToken::class)
    ->name('api.login');
Route::post('/register', Register::class)
    ->middleware('web')
    ->name('api.register');
Route::post('/password-reset', ResetPassword::class)->name(
    'api.password.reset',
);
Route::post('/send-password-reset-link', SendPasswordResetLink::class)->name(
    'api.password.email',
);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/verify-email', VerifyEmail::class)->name(
        'api.verification.verify',
    );
    // Logout needs web middleware (session + CSRF) to clear Redis sessions for Filament
    Route::post('/logout', Logout::class)
        ->middleware('web')
        ->name('api.logout');
    Route::post('/confirm-password', ConfirmPassword::class)->name(
        'api.password.confirm',
    );
    Route::post('/update-password', UpdatePassword::class)->name(
        'api.password.update',
    );
    Route::post('/disconnect-google', DisconnectGoogle::class)->name(
        'api.disconnect-google',
    );
    Route::post(
        '/send-email-verification-notification',
        SendEmailVerificationNotification::class,
    )->name('api.verification.send');

    // Real-time test endpoint
    Route::post(
        '/trigger-test-event',
        App\Actions\Realtime\TriggerTestEvent::class,
    )->name('api.trigger-test-event');
});

// Content routes (no auth required for demo)
Route::get('/content', App\Actions\Content\ShowContent::class)->name(
    'api.content',
);
