<?php

declare(strict_types=1);

namespace App\Features\Auth\Actions;

use App\Features\Auth\Requests\UpdatePasswordRequest;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class UpdatePassword
{
    /**
     * Update the user's password.
     */
    public function __invoke(UpdatePasswordRequest $data): Response
    {
        $user = assertedUser();

        $user->update([
            'password' => Hash::make($data->password),
        ]);

        return redirect()->route('profile');
    }
}
