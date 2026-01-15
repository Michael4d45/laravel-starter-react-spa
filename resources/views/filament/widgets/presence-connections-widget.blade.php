<x-filament::section>
    <x-slot name="heading">
        Presence Connections
    </x-slot>

    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500 dark:text-gray-400">
                Channel
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ $channelName }}
            </div>
        </div>

        <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500 dark:text-gray-400">
                Active users
            </div>
            <div class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ count($users) }}
            </div>
        </div>

        @if ($error)
            <div class="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                {{ $error }}
            </div>
        @endif

        <div class="flex flex-col gap-2">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-200">
                Online now
            </div>
            @if (count($users) === 0)
                <div
                    class="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No active users in presence channel.
                </div>
            @else
                <ul class="flex flex-col gap-2">
                    @foreach ($users as $user)
                        <li
                            class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:text-gray-100">
                            <span class="font-medium">
                                {{ $user['name'] ?? 'Unknown user' }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                {{ $user['id'] }}
                            </span>
                        </li>
                    @endforeach
                </ul>
            @endif
        </div>
    </div>
</x-filament::section>
