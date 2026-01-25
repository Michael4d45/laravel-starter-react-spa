<?php

declare(strict_types=1);

beforeEach(function () {
    $this->admin = \App\Models\User::factory()->create(['is_admin' => true]);
    setup_log_capture('filament-pages.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/filament-pages.log'));
});

test('admin dashboard page loads', function (): void {
    visit(route('filament.admin.pages.dashboard'))
        ->assertSee('Sign in')
        ->type('#form\\.email', $this->admin->email)
        ->type('#form\\.password', 'password')
        ->submit()
        ->waitForText('Dashboard')
        ->assertSee('Dashboard');
});

/****
 * User
 ****/

test('admin users page loads', function (): void {
    $this->actingAs($this->admin);
    visit(route('filament.admin.resources.users.index'))
        ->waitForText('Users')
        ->assertSee('Users')
        ->assertSee($this->admin->email); // Verify admin user is listed
});

test('admin users edit page loads', function (): void {
    $this->actingAs($this->admin);
    visit(route('filament.admin.resources.users.edit', $this->admin))
        ->waitForText('Edit User')
        ->assertSee('Edit User');
});

test('admin users create page loads', function (): void {
    $this->actingAs($this->admin);
    visit(route('filament.admin.resources.users.create'))
        ->waitForText('Create User')
        ->assertSee('Create User');
});
