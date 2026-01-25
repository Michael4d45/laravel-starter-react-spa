<?php

declare(strict_types=1);

use App\Models\Device;
use App\Models\DeviceClaim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('forbids non-admin users from admin routes', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $device = Device::factory()->create();
    $code = Str::upper(Str::random(8));

    DeviceClaim::create([
        'device_id' => $device->id,
        'code' => $code,
        'expires_at' => now()->addHour(),
    ]);

    $this
        ->actingAs($user)
        ->get("/admin/devices/claim/qr/{$code}.png")
        ->assertForbidden();
});

it('allows admin users to access admin routes', function () {
    $user = User::factory()->create(['is_admin' => true]);
    $device = Device::factory()->create();
    $code = Str::upper(Str::random(8));

    DeviceClaim::create([
        'device_id' => $device->id,
        'code' => $code,
        'expires_at' => now()->addHour(),
    ]);

    $this
        ->actingAs($user)
        ->get("/admin/devices/claim/qr/{$code}.png")
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png');
});
