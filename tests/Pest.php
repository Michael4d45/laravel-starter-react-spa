<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Pest\Browser\Api\AwaitableWebpage;
use Pest\Browser\Enums\Device;
use Pest\Browser\Playwright\InitScript;
use Pest\Browser\Playwright\Playwright;
use Pest\Browser\Support\ComputeUrl;
use Tests\TestCase;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in(
    'Feature',
    'Browser',
    'Unit',
);

function enable_logs()
{
    config()->set('logging.should_log_user', true);
    config()->set('logging.should_log_request', true);
    config()->set('logging.should_log_response', true);
    config()->set('logging.should_log_validation_errors', true);
}

function assert_status($response, int $expectedStatus): \Pest\Expectation
{
    $actualStatus = $response->getStatusCode();
    if ($actualStatus !== $expectedStatus) {
        $body = (string) $response->getContent();
        throw new Exception(
            "Expected status code {$expectedStatus} but received {$actualStatus}.\nResponse body: {$body}",
        );
    }

    return expect($response);
}

function setup_log_capture(string $filename): string
{
    $logPath = storage_path('logs/' . $filename);
    config()->set('logging.channels.single.path', $logPath);
    file_put_contents($logPath, '');

    return $logPath;
}

function assert_no_log_errors(string $logPath): void
{
    $logContents = file_get_contents($logPath);
    expect($logContents)->not->toContain('"level_name":"ERROR"');
}

function get_console_messages($page): array
{
    $logs = $page->script('window.__pestBrowser.consoleLogs || []');

    return array_column($logs, 'message');
}

function visit_with_error_init(
    string $url,
    array $options = [],
    array $initScripts = [],
): mixed {
    // Add our custom error logging init script
    $initScripts[] = <<<'JS'
        const originalConsoleError = console.error;
        console.error = function(...args) {
            window.__pestBrowser.jsErrors.push({
                message: "ERROR: " + args.map(a => a ? a.toString() : "null").join(" ")
            }); 
            originalConsoleError.apply(console, args);
        };

        window.addEventListener("unhandledrejection", (e) => {
            window.__pestBrowser.jsErrors.push({
                message: "Unhandled promise rejection: " + event.reason,
                trace: event.reason?.stack || ''
            });
        });
        JS;

    return visit_with_custom_init($url, $options, $initScripts);
}

function visit_with_custom_init(
    string $url,
    array $options = [],
    array $initScripts = [],
): mixed {
    // Create the page with custom init script for error logging
    $browserType = Playwright::defaultBrowserType();
    $device = Device::DESKTOP;

    $browser = Playwright::browser($browserType)->launch();

    $context = $browser->newContext([
        'locale' => 'en-US',
        'timezoneId' => 'UTC',
        'colorScheme' => Playwright::defaultColorScheme()->value,
        ...$device->context(),
        ...$options,
    ]);

    $context->addInitScript(InitScript::get());

    foreach ($initScripts as $initScript) {
        $context->addInitScript($initScript);
    }

    $computedUrl = ComputeUrl::from($url);

    return new AwaitableWebpage(
        $context->newPage()->goto($computedUrl, $options),
        $computedUrl,
    );
}
