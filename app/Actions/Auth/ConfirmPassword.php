<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Http\Requests\AuthRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class ConfirmPassword
{
    /**
     * Confirm the user's password.
     */
    public function __invoke(AuthRequest $request): RedirectResponse
    {
        $user = $request->assertedUser();

        if (!Auth::guard('web')->validate([
            'email' => $user->email,
            'password' => $request->password,
        ])) {
            throw ValidationException::withMessages([
                'password' => __('auth.password'),
            ]);
        }

        $request->session()->put('auth.password_confirmed_at', time());

        return redirect()->intended(route('home', absolute: false));
    }
}
