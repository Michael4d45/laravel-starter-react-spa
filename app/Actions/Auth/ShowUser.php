<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\Models\UserData;
use App\Http\Requests\AuthRequest;
use Symfony\Component\HttpFoundation\Response;

class ShowUser
{
    /**
     * Get the authenticated user.
     */
    public function __invoke(AuthRequest $request): Response
    {
        return response()->json(UserData::from($request->assertedUser()));
    }
}
