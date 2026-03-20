<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function ($user, string $token) {
            assert(
                $user instanceof \App\Models\User,
                'User must be an instance of App\Models\User',
            );

            // The purpose of this custom registration is to generate a signed URL
            return \Illuminate\Support\Facades\URL::signedRoute('password.reset', [
                'email' => $user->email,
                'token' => $token,
            ]);
        });
    }
}
