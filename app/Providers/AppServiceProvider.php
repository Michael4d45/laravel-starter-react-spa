<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config()->boolean('logging.should_log_db')) {
            DB::listen(static function (QueryExecuted $query): void {
                [$file, $line] = earliest_app_caller();

                $sql = $query->toRawSql();

                if (str_contains($sql, '"sessions"')) {
                    return;
                }

                Log::debug('sql', [
                    'SQL' => $sql . ';',
                    'execution_time' => $query->time . 'ms',
                    'file' => $file !== null ? "{$file}:{$line}" : null,
                ]);
            });
        }
    }
}

// You can place this helper at the bottom of this file or in a separate helper file.
if (!function_exists('earliest_app_caller')) {
    /**
     * @return array{0: string|null, 1: int|null}
     */
    function earliest_app_caller(): array
    {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        $basePath = base_path();
        $vendorPath = base_path('vendor');

        $frames = [];
        foreach ($trace as $frame) {
            $file = $frame['file'] ?? null;
            $line = $frame['line'] ?? null;
            if (!$file || !$line) {
                continue;
            }

            $file = str_replace('\\', '/', $file);

            if (str_starts_with($file, str_replace('\\', '/', $vendorPath))) {
                continue;
            }
            if (str_starts_with($file, 'phar://')) {
                continue;
            }
            if (!str_starts_with($file, str_replace('\\', '/', $basePath))) {
                continue;
            }
            if (str_contains($file, '/bootstrap/cache/')) {
                continue;
            }

            $frames[] = ['file' => $file, 'line' => $line];
        }

        if (count($frames) === 0) {
            return [null, null];
        }
        $earliest = end($frames);

        return [$earliest['file'], $earliest['line']];
    }
}
