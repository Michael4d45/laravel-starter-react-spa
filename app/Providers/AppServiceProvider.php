<?php

declare(strict_types=1);

namespace App\Providers;

use App\Http\Middleware\LoggingHelper;
use App\Models\PersonalAccessToken;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

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
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
        $shouldIgnoreRoute = LoggingHelper::shouldIgnoreRoute(request());

        if (config()->boolean('logging.should_log_db') && !$shouldIgnoreRoute) {
            DB::listen(static function (QueryExecuted $query): void {
                $trace = get_collapsed_trace();
                Log::debug('sql', [
                    'SQL' => $query->toRawSql() . ';',
                    'execution_time' => $query->time . 'ms',
                    'file' => $trace,
                ]);
            });
        }
    }
}

if (!function_exists('original_blade_from_compiled')) {
    function original_blade_from_compiled(string $compiledFile): null|string
    {
        if (!is_file($compiledFile)) {
            return null;
        }

        $contents = file_get_contents($compiledFile);
        if ($contents === false) {
            return null;
        }

        if (preg_match('/\/\*\*PATH\s+(.*?)\s+ENDPATH\*\*\//', $contents, $m)) {
            return $m[1];
        }

        return null;
    }
}
// You can place this helper at the bottom of this file or in a separate helper file.
if (!function_exists('earliest_app_caller')) {
    /**
     * @return array<int, string>
     */
    function get_collapsed_trace(): array
    {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        $basePath = str_replace('\\', '/', base_path());
        $vendorPath = str_replace('\\', '/', base_path('vendor'));

        $lines = [];
        $inVendorBlock = false;

        foreach ($trace as $frame) {
            $file = isset($frame['file'])
                ? str_replace('\\', '/', $frame['file'])
                : null;
            $line = $frame['line'] ?? 0;

            if (!$file) {
                continue;
            }

            if (str_contains($file, 'storage/framework/views')) {
                $original = original_blade_from_compiled($file);
                $file = $original ?? $file;
                $line = $original ? 0 : $line;
            }

            // $lines[] = "{$file}:{$line}";
            // continue;

            // 1. Check if we are in vendor code
            if (str_starts_with($file, $vendorPath)) {
                if (!$inVendorBlock) {
                    $inVendorBlock = true;
                }
                continue;
            }

            // Reset vendor flag when we hit app code
            $inVendorBlock = false;

            if (str_contains($file, 'public/index.php')) {
                continue;
            }

            // 2. Skip this specific provider/logging logic
            if (str_contains($file, 'AppServiceProvider.php')) {
                continue;
            }
            if (str_contains($file, 'app/Http/Middleware')) {
                continue;
            }

            // 3. Make the path relative to project root for readability
            $relativeFile = str_replace($basePath . '/', '', $file);

            // 4. Resolve Compiled Blade Views to original names
            if (str_contains($relativeFile, 'storage/framework/views/')) {
                // Laravel 10+ includes the path to the original blade file in a comment at the top
                if (is_readable($file)) {
                    $handle = fopen($file, 'r');
                    if ($handle !== false) {
                        $firstLine = fgets($handle);
                        fclose($handle);
                        if (
                            $firstLine !== false
                            && preg_match(
                                '/content:\s*(.+?\.blade\.php)/',
                                $firstLine,
                                $matches,
                            )
                        ) {
                            $relativeFile =
                                str_replace($basePath . '/', '', $matches[1])
                                . ' (compiled)';
                        }
                    }
                }
            }

            $lines[] = "{$relativeFile}:{$line}";
        }

        return $lines;
    }
}
