<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Requests\UpdatePasswordRequest;
use App\Http\Requests\AuthRequest;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class UpdatePassword
{
    /**
     * Update the user's password.
     */
    public function __invoke(
        UpdatePasswordRequest $data,
        AuthRequest $request,
    ): Response {
        $user = $request->assertedUser();

        $user->update([
            'password' => Hash::make($data->password),
        ]);

        return redirect()->route('profile');
    }
}
