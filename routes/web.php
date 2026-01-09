<?php

use App\Actions\Auth\HandleGoogleCallback;
use App\Actions\Auth\RedirectToGoogle;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;

// OAuth routes (need sessions for Socialite) - explicitly use web middleware
Route::get('/auth/google', RedirectToGoogle::class)->name('auth.google');

// OAuth callback needs to be excluded from CSRF validation
Route::get(
    '/auth/google/callback',
    HandleGoogleCallback::class,
)->withoutMiddleware(ValidateCsrfToken::class)->name('auth.google.callback');

Route::get('/login', function () {
    return view('app');
})->name('login');

// Catch-all route to serve the React SPA
// React Router handles client-side routing for all paths
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*')->name('home');
