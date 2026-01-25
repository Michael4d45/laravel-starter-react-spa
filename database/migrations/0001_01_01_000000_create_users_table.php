<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', static function (Blueprint $table): void {
            $table->uuid('id')->primary();

            $table->string('name');

            $table->string('password')->nullable();
            $table->rememberToken();
            $table->string('email')->unique();
            $table->timestampTz('email_verified_at')->nullable();

            $table->string('google_id')->nullable()->unique();
            $table->text('verified_google_email')->nullable()->unique();

            $table->boolean('is_admin')->default(false);
            $table->boolean('is_guest')->default(false);

            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('password_reset_tokens', static function (Blueprint $table): void {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestampTz('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
