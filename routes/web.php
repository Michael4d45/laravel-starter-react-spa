<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get(
    'verify-email/{id}/{hash}',
    \App\Features\Auth\Actions\VerifyEmail::class,
)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

Route::get('reset-password/{email}/{token}', fn() => view('app'))->middleware([
    'signed',
    'throttle:6,1',
])->name('password.reset');

Route::post('login', \App\Features\Auth\Actions\Login::class);
Route::post('register', \App\Features\Auth\Actions\Register::class);
Route::middleware('auth')->post(
    'logout',
    \App\Features\Auth\Actions\Logout::class,
);

// Google OAuth routes
Route::get(
    'auth/google',
    \App\Features\Auth\Actions\RedirectToGoogle::class,
)->name('auth.google');
Route::get(
    'auth/google/callback',
    \App\Features\Auth\Actions\HandleGoogleCallback::class,
)->name('auth.google.callback');

Route::get('login', fn() => view('app'))->name('login');

Route::get('{any?}', fn() => view('app'))->where(
    'any',
    '^(?!api|storage|js).*$',
)->name('home');
