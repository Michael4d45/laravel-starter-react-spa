<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class Register
{
    /**
     * Handle an incoming registration request.
     *
     * For guest users: promote them to real users by updating their record.
     * For existing authenticated users: this shouldn't happen, but handle gracefully.
     *
     * @throws ValidationException
     */
    public function __invoke(Request $request): Response
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:' . User::class,
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);
        $currentUser = $request->user();

        if ($currentUser && $currentUser->is_guest) {
            // Promote guest user to real user
            $currentUser->update([
                'name' => (string) $request->string('name'),
                'email' => (string) $request->string('email'),
                'password' => Hash::make((string) $request->string('password')),
                'is_guest' => false,
                'email_verified_at' => now(),
            ]);

            $user = $currentUser->fresh(); // Get updated user
            assert($user instanceof User, 'User must exist after update');
        } else {
            // Fallback: create new user (shouldn't happen with guest middleware)
            $user = User::create([
                'name' => (string) $request->string('name'),
                'email' => (string) $request->string('email'),
                'password' => Hash::make((string) $request->string('password')),
                'email_verified_at' => now(),
                'is_guest' => false,
                'is_admin' => false,
            ]);
        }

        event(new Registered($user));

        Auth::login($user);

        // Return JSON response for API requests
        if (request()->expectsJson()) {
            $token = $user->createToken('api-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => $user,
            ]);
        }

        // Return redirect for web requests
        return redirect()->route('home');
    }
}
