<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Http\Request;

class AuthRequest extends Request
{
    public function assertedUser(): User
    {
        $user = auth()->user();

        if ($user === null) {
            // TODO: get guest user from session
        }

        assert($user instanceof User, 'User must be authenticated');
        return $user;
    }
}
