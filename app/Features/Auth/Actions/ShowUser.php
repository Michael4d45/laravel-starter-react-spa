<?php

declare(strict_types=1);

namespace App\Features\Auth\Actions;

use App\Data\Models\UserData;
use App\Features\Auth\Requests\AuthRequest;
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
