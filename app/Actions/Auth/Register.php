<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\RegisterRequest;
use App\Data\Response\MessageResponse;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * IMPORTANT: This action establishes session-based authentication.
 *
 * After registration, the frontend stores user data and uses
 * session cookies for subsequent API requests.
 *
 * TODO: account for "is_guest" users.
 */
class Register
{
    /**
     * Handle an incoming registration request.
     *
     * Creates user, logs them in with session, then returns success.
     * Frontend stores user data and uses session cookies for API auth.
     */
    public function __invoke(RegisterRequest $registerData): JsonResponse
    {
        // Create new user
        $user = User::create([
            'name' => $registerData->name,
            'email' => $registerData->email,
            'password' => Hash::make($registerData->password),
            'email_verified_at' => null,
            'is_admin' => false,
            'is_guest' => false,
            'google_id' => null,
        ]);

        event(new Registered($user));

        Auth::login($user);

        $request = request();
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(MessageResponse::from([
            'message' => 'Registration successful',
        ]));
    }
}
