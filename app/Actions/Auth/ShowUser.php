<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ShowUser
{
    /**
     * Get the authenticated user.
     */
    public function __invoke(Request $request): Response
    {
        return response()->json($request->user());
    }
}
