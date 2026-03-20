<?php

declare(strict_types=1);

use App\Models\User;

/**
 * Return the authenticated user, asserting that one exists.
 */
if (!function_exists('assertedUser')) {
    function assertedUser(): User
    {
        $user = request()->user();

        if (!$user instanceof User) {
            throw new RuntimeException('User must be authenticated');
        }

        return $user;
    }
}
