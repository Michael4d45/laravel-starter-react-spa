<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\Widget;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PresenceConnectionsWidget extends Widget
{
    protected string $view = 'filament.widgets.presence-connections-widget';

    protected static null|int $sort = 3;

    protected null|string $pollingInterval = '10s';

    protected function getViewData(): array
    {
        $channelName = 'presence-online';
        $users = [];
        $error = null;

        try {
            $userIds = $this->fetchPresenceUserIds($channelName);
            $users = $this->resolveUsers($userIds);
        } catch (\Throwable $exception) {
            Log::warning('Failed to fetch presence users', [
                'channel' => $channelName,
                'error' => $exception->getMessage(),
            ]);
            $error = 'Unable to load presence data. Check Reverb server connectivity.';
        }

        return [
            'channelName' => $channelName,
            'users' => $users,
            'error' => $error,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function fetchPresenceUserIds(string $channel): array
    {
        $appId = config()->string('reverb.apps.apps.0.app_id');
        $appKey = config()->string('reverb.apps.apps.0.key');
        $appSecret = config()->string('reverb.apps.apps.0.secret');

        $serverName = config()->string('reverb.default', 'reverb');
        $host = config()->string(
            "reverb.servers.{$serverName}.host",
            '127.0.0.1',
        );
        $port = config()->integer("reverb.servers.{$serverName}.port", 8080);
        $scheme = config()->string(
            "reverb.servers.{$serverName}.options.scheme",
            'http',
        );

        if ($host === '0.0.0.0') {
            $host = '127.0.0.1';
        }

        $path = "/apps/{$appId}/channels/{$channel}/users";

        $query = [
            'auth_key' => $appKey,
            'auth_timestamp' => (string) time(),
            'auth_version' => '1.0',
        ];

        $signature = $this->signReverbRequest('GET', $path, $query, $appSecret);
        $query['auth_signature'] = $signature;

        $url = sprintf('%s://%s:%d%s', $scheme, $host, $port, $path);

        $response = Http::get($url, $query);

        return $this->parseUserIds($response);
    }

    /**
     * @param array<string, string> $query
     */
    private function signReverbRequest(
        string $method,
        string $path,
        array $query,
        string $secret,
    ): string {
        ksort($query);
        $queryString = http_build_query($query);
        $stringToSign =
            strtoupper($method) . "\n" . $path . "\n" . $queryString;

        return hash_hmac('sha256', $stringToSign, $secret);
    }

    /**
     * @return array<int, string>
     */
    private function parseUserIds(Response $response): array
    {
        if (!$response->successful()) {
            throw new \RuntimeException(
                'Presence API request failed with status '
                    . $response->status(),
            );
        }

        $payload = $response->json();
        if (!is_array($payload)) {
            throw new \RuntimeException('Invalid presence API response.');
        }

        $users = Arr::get($payload, 'users', []);
        if (!is_array($users)) {
            $users = [];
        }

        $ids = [];
        foreach ($users as $user) {
            $id = is_array($user) ? $user['id'] ?? null : null;
            if (is_string($id) || is_int($id)) {
                if ((string) $id !== '') {
                    $ids[] = (string) $id;
                }
            }
        }

        return $ids;
    }

    /**
     * @param array<int, string> $userIds
     * @return array<int, array{id: string, name: string}>
     */
    private function resolveUsers(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $users = User::query()->whereIn('id', $userIds)->get(['id', 'name']);

        $names = $users->mapWithKeys(function (User $user): array {
            return [$user->id => $user->name ?? 'Unknown user'];
        });

        return collect($userIds)
            ->unique()
            ->values()
            ->map(function (string $userId) use ($names): array {
                return [
                    'id' => $userId,
                    'name' => $names->get($userId, 'Unknown user'),
                ];
            })
            ->all();
    }
}
