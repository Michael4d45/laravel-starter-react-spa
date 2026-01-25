<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get(
    'verify-email/{id}/{hash}',
    \App\Actions\Auth\VerifyEmail::class,
)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

Route::get('reset-password/{email}/{token}', fn() => view('app'))->middleware([
    'signed',
    'throttle:6,1',
])->name('password.reset');

Route::post('login', \App\Actions\Auth\Login::class);
Route::post('register', \App\Actions\Auth\Register::class);

// Google OAuth routes
Route::get('auth/google', \App\Actions\Auth\RedirectToGoogle::class)->name(
    'auth.google',
);
Route::get(
    'auth/google/callback',
    \App\Actions\Auth\HandleGoogleCallback::class,
)->name('auth.google.callback');

Route::get('login', fn() => view('app'))->name('login');

Route::get('{any?}', fn() => view('app'))->where(
    'any',
    '^(?!api|storage).*$',
)->name('home');
