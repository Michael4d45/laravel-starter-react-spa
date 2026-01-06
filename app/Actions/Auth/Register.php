<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\RegisterRequest;
use App\Data\Response\AuthResponse;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class Register
{
    /**
     * Handle an incoming registration request.
     *
     * For guest users: promote them to real users by updating their record.
     * For existing authenticated users: this shouldn't happen, but handle gracefully.
     */
    public function __invoke(
        RegisterRequest $registerData,
        Request $request,
    ): Response {
        $currentUser = $request->user();

        if ($currentUser && $currentUser->is_guest) {
            // Promote guest user to real user
            $currentUser->update([
                'name' => $registerData->name,
                'email' => $registerData->email,
                'password' => Hash::make($registerData->password),
                'is_guest' => false,
                'email_verified_at' => now(),
            ]);

            $user = $currentUser->fresh(); // Get updated user
            assert($user instanceof User, 'User must exist after update');
        } else {
            // Fallback: create new user (shouldn't happen with guest middleware)
            $user = User::create([
                'name' => $registerData->name,
                'email' => $registerData->email,
                'password' => Hash::make($registerData->password),
                'email_verified_at' => now(),
                'is_guest' => false,
                'is_admin' => false,
                'google_id' => null,
            ]);
        }

        event(new Registered($user));

        Auth::login($user);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json(AuthResponse::from([
            'token' => $token,
            'user' => $user,
        ]));
    }
}
