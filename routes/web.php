<?php

use App\Actions\Auth\HandleGoogleCallback;
use App\Actions\Auth\RedirectToGoogle;
use Illuminate\Support\Facades\Route;

// OAuth routes (need sessions for Socialite) - explicitly use web middleware
Route::middleware(['web'])->group(function (): void {
    Route::get('/auth/google', RedirectToGoogle::class)->name('auth.google');
});

// OAuth callback needs to be excluded from CSRF validation
Route::middleware(['web'])->withoutMiddleware([
    'Illuminate\Foundation\Http\Middleware\ValidateCsrfToken',
])->group(function (): void {
    Route::get('/auth/google/callback', HandleGoogleCallback::class)->name(
        'auth.google.callback',
    );
});

Route::get('/login', function () {
    return view('app');
})->name('login');

// Catch-all route to serve the React SPA
// React Router handles client-side routing for all paths
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*')->name('home');
