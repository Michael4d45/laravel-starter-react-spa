<?php

use App\Actions\Auth\ConfirmPassword;
use App\Actions\Auth\CreateToken;
use App\Actions\Auth\DisconnectGoogle;
use App\Actions\Auth\HandleGoogleCallback;
use App\Actions\Auth\Login;
use App\Actions\Auth\Logout;
use App\Actions\Auth\RedirectToGoogle;
use App\Actions\Auth\Register;
use App\Actions\Auth\ResetPassword;
use App\Actions\Auth\SendEmailVerificationNotification;
use App\Actions\Auth\SendPasswordResetLink;
use App\Actions\Auth\ShowUser;
use App\Actions\Auth\UpdatePassword;
use App\Actions\Auth\VerifyEmail;
use Illuminate\Support\Facades\Route;

Route::get('/user', ShowUser::class)->middleware('auth:sanctum')->name(
    'api.user',
);

// Create token for already authenticated user (used for OAuth callbacks and session auth)
Route::get('/token', CreateToken::class)->middleware('auth')->name('api.token');

Route::post('/login', Login::class)->name('api.login');
Route::post('/register', Register::class)->name('api.register');
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
    Route::post('/logout', Logout::class)->name('api.logout');
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
});

// Content routes (no auth required for demo)
Route::get('/content', App\Actions\Content\ShowContent::class)->name(
    'api.content',
);
