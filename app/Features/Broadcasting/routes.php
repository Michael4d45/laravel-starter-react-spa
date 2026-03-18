<?php

declare(strict_types=1);

use App\Features\Broadcasting\Actions\AuthenticateBroadcasting;
use Illuminate\Support\Facades\Route;

Route::post('broadcasting/auth', AuthenticateBroadcasting::class);
