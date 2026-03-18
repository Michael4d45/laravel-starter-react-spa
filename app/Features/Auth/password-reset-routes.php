<?php

declare(strict_types=1);

use App\Features\Auth\Actions\ResetPassword;
use App\Features\Auth\Actions\SendPasswordResetLink;
use Illuminate\Support\Facades\Route;

Route::post('send-password-reset-link', SendPasswordResetLink::class);
Route::post('reset-password', ResetPassword::class);
