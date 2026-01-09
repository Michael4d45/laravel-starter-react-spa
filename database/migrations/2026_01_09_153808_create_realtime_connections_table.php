<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('realtime_connections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('socket_id')->unique();
            $table->uuid('user_id');
            $table->string('channel_name');
            $table->string('ip_address')->nullable();
            $table->json('user_agent')->nullable();
            $table->timestamp('connected_at');
            $table->timestamp('disconnected_at')->nullable();
            $table->timestamps();

            $table
                ->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
            $table->index(['user_id', 'connected_at']);
            $table->index(['channel_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('realtime_connections');
    }
};
