<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use Carbon\Carbon;
use Composer\InstalledVersions;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;

class SystemInfoWidget extends BaseWidget
{
    protected string|null $heading = 'System Information';

    protected function getStats(): array
    {
        $laravelVersion = app()->version();
        $phpVersion = phpversion();
        $filamentVersion = ltrim(
            InstalledVersions::getPrettyVersion('filament/filament')
            ?? 'Unknown',
            'v',
        );

        $timeAgo = 'N/A';
        $commitMessage = 'N/A';
        $lastCommitTime = null;
        try {
            $result = Process::run(['git', 'log', '--format=%s|%ct', '-1']);
            $output = trim((string) $result->output());
            [$commitMessage, $timestampStr] = explode('|', $output, 2);
            $lastCommitTime = (int) $timestampStr;
            $timeAgo =
                Carbon::createFromTimestamp($lastCommitTime)->diffForHumans();
        } catch (\Exception $e) {
            // If git isn't available (e.g. .git excluded on production), try a fallback file
            try {
                $releaseInfoPath = base_path('.release-info');
                if (file_exists($releaseInfoPath)) {
                    $file = trim((string) file_get_contents($releaseInfoPath));
                    if ($file !== '') {
                        [$commitMessage, $timestampStr] = explode(
                            '|',
                            $file,
                            3,
                        );
                        $lastCommitTime = (int) $timestampStr;
                        $timeAgo =
                            Carbon::createFromTimestamp(
                                $lastCommitTime,
                            )->diffForHumans();
                    }
                }
            } catch (\Throwable $ignore) {
                // still ignore
            }
        }

        $latestLaravel = $this->getLatestVersionFromPackagist(
            'laravel/framework',
        );
        $latestPhp = $this->getLatestPhpVersion();
        $latestFilament = $this->getLatestVersionFromPackagist(
            'filament/filament',
        );

        $laravelStat = Stat::make('Laravel Version', $laravelVersion)->icon(
            'heroicon-o-cpu-chip',
        );
        if (
            $latestLaravel
            && version_compare($laravelVersion, $latestLaravel, '<')
        ) {
            $laravelStat
                ->color('danger')
                ->description($latestLaravel . ' available');
        }

        $phpStat = Stat::make('PHP Version', $phpVersion)->icon(
            'heroicon-o-code-bracket',
        );
        if ($latestPhp && version_compare($phpVersion, $latestPhp, '<')) {
            $phpStat->color('danger')->description($latestPhp . ' available');
        }

        $filamentStat = Stat::make('Filament Version', $filamentVersion)->icon(
            'heroicon-o-squares-2x2',
        );
        if (
            $latestFilament
            && $filamentVersion !== 'Unknown'
            && version_compare($filamentVersion, $latestFilament, '<')
        ) {
            $filamentStat
                ->color('danger')
                ->description($latestFilament . ' available');
        }

        $deploymentStat = Stat::make('Last Deployment', $timeAgo)
            ->description($commitMessage)
            ->icon('heroicon-o-clock')
            ->extraAttributes([
                'title' => $lastCommitTime
                    ? date('Y-m-d H:i:s T', $lastCommitTime)
                    : 'N/A',
            ]);

        return [
            $laravelStat,
            $phpStat,
            $filamentStat,
            $deploymentStat,
        ];
    }

    private function getLatestPhpVersion(): string|null
    {
        try {
            $response = Http::get('https://www.php.net/releases/active.php');
            if ($response->successful()) {
                $data = $response->json();
                if (is_array($data)) {
                    $versions = [];
                    foreach ($data as $major => $minors) {
                        if (!is_array($minors)) {
                            continue;
                        }

                        foreach ($minors as $minor => $info) {
                            if (
                                !(
                                    is_array($info)
                                    && isset($info['version'])
                                    && is_string($info['version'])
                                )
                            ) {
                                continue;
                            }

                            $versions[] = $info['version'];
                        }
                    }

                    return $versions === [] ? null : max($versions);
                }
            }
        } catch (\Exception $e) {
        }

        return null;
    }

    private function getLatestVersionFromPackagist(string $package): string|null
    {
        try {
            $response = Http::get(
                "https://packagist.org/packages/{$package}.json",
            );
            if ($response->successful()) {
                $data = $response->json();
                if (
                    is_array($data)
                    && isset($data['package'])
                    && is_array($data['package'])
                    && isset($data['package']['versions'])
                    && is_array($data['package']['versions'])
                ) {
                    $versions = array_filter(
                        array_keys($data['package']['versions']),
                        fn($v) => (
                            is_string($v)
                            && !preg_match('/(dev|alpha|beta|rc)/i', $v)
                        ),
                    );
                    $versions = array_map(fn($v) => ltrim($v, 'v'), $versions);
                    usort($versions, fn(
                        string $a,
                        string $b,
                    ) => version_compare($a, $b));
                    $latest = end($versions);

                    return is_string($latest) ? $latest : null;
                }
            }
        } catch (\Exception $e) {
        }

        return null;
    }
}
