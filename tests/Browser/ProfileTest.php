<?php

declare(strict_types=1);

beforeEach(function () {
    setup_log_capture('profile.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/profile.log'));
});

it('profile page redirects to login when not authenticated', function (): void {
    visit('/profile')->assertNoJavaScriptErrors()->assertPathIs('/login');
});
