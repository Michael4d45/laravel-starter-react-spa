<?php

declare(strict_types=1);

namespace App\Features\Auth\Actions;

use App\Data\Models\UserData;
use Symfony\Component\HttpFoundation\Response;

class ShowUser
{
    /**
     * Get the authenticated user.
     */
    public function __invoke(): Response
    {
        return response()->json(UserData::from(assertedUser()));
    }
}
