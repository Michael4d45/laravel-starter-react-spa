<?php

declare(strict_types=1);

use App\Features\Auth\Actions\ConfirmPassword;
use App\Features\Auth\Actions\DisconnectGoogle;
use App\Features\Auth\Actions\SendEmailVerificationNotification;
use App\Features\Auth\Actions\ShowUser;
use App\Features\Auth\Actions\UpdatePassword;
use Illuminate\Support\Facades\Route;

Route::get('user', ShowUser::class);
Route::post('confirm-password', ConfirmPassword::class);
Route::post('update-password', UpdatePassword::class);
Route::post('disconnect-google', DisconnectGoogle::class);
Route::post(
    'send-email-verification-notification',
    SendEmailVerificationNotification::class,
);
