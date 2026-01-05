<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        self::assertEquals(
            'testing',
            config('app.env'),
            'Environment is not testing, make sure to clear cache. `php artisan config:clear`',
        );
        self::assertEquals(
            'sqlite',
            config('database.default'),
            'Database connection is not sqlite, make sure to clear cache. `php artisan config:clear`',
        );
    }
}
