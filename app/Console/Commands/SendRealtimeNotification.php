<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\TestRealtimeEvent;
use App\Models\User;
use Illuminate\Console\Command;

class SendRealtimeNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:notify {email : The email of the user to notify} {message : The message to send}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a real-time notification to a specific user via Reverb';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');
        $message = $this->argument('message');

        /** @var User|null $user */
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email [{$email}] not found.");
            return Command::FAILURE;
        }

        $this->info("Sending notification to [{$user->name}] ({$email})...");

        event(new TestRealtimeEvent($user, $message));

        $this->info('Event dispatched successfully!');

        return Command::SUCCESS;
    }
}
