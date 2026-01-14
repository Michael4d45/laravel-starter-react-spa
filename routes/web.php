<?php

use Illuminate\Support\Facades\Route;

Route::prefix('auth')
    ->withoutMiddleware(['web'])
    ->group(function () {
        require __DIR__ . '/oauth-spa.php';
    });

Route::get(
    'verify-email/{id}/{hash}',
    \App\Actions\Auth\VerifyEmail::class,
)->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

Route::get('reset-password/{email}/{token}', fn() => view('app'))->middleware([
    'signed',
    'throttle:6,1',
])->name('password.reset');

Route::get('login', fn() => view('app'))->name('login');

Route::get('{any?}', fn() => view('app'))->where(
    'any',
    '^(?!api|storage|admin).*$',
)->name('home');
