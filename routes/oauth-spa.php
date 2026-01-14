<?php

use App\Actions\Auth\HandleGoogleCallback;
use App\Actions\Auth\RedirectToGoogle;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

/**
 * OAuth routes for the SPA.
 *
 * These routes are stateless and don't rely on the Laravel session
 * for authentication of the SPA client, though Socialite itself
 * may use a temporary state session if not in stateless mode.
 * We use ->stateless() in the actions to avoid session reliance.
 */

Route::get('google', RedirectToGoogle::class);

Route::get('google/callback', HandleGoogleCallback::class)->middleware([
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
])->withoutMiddleware(ValidateCsrfToken::class);
