<?php

declare(strict_types=1);

namespace App\Models;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

/**
 * User model for authentication and user management.
 *
 * @property string $id
 * @property string|null $name
 * @property string|null $email
 * @property string|null $verified_google_email
 * @property string|null $password
 * @property bool $is_guest
 * @property bool $is_admin
 * @property string|null $google_id
 * @property Carbon|null $email_verified_at
 * @property string|null $remember_token
 * @property Carbon|null $updated_at
 * @property Carbon|null $created_at
 */
class User extends Authenticatable implements MustVerifyEmail, FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    use HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_guest',
        'is_admin',
        'google_id',
        'verified_google_email',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return !$this->is_guest && $this->is_admin;
    }

    /**
     * Merge guest user data to the real user and delete the guest.
     */
    public static function mergeGuestData(self $guest, self $user): void
    {
        // @phpstan-ignore closure.unusedUse
        DB::transaction(function () use ($guest, $user) {
            // Transfer game sessions hosted by guest
            // GameSession::where('host_id', $guest->id)->update([
            //     'host_id' => $user->id,
            // ]);

            // Delete the guest user
            $guest->delete();
        });
    }
}
