<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Pest\Browser\Api\AwaitableWebpage;
use Pest\Browser\Enums\Device;
use Pest\Browser\Playwright\InitScript;
use Pest\Browser\Playwright\Playwright;
use Pest\Browser\Support\ComputeUrl;
use Pest\Expectation;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

pest()->extend(TestCase::class)->use(RefreshDatabase::class)->in(
    'Feature',
    'Browser',
    'Unit',
);

function enable_logs(): void
{
    config()->set('logging.should_log_user', true);
    config()->set('logging.should_log_request', true);
    config()->set('logging.should_log_response', true);
    config()->set('logging.should_log_validation_errors', true);
}

/**
 * @param  TestResponse<Response>  $response
 * @return Expectation<TestResponse<Response>>
 */
function assert_status(TestResponse $response, int $expectedStatus): Expectation
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

/**
 * @return list<mixed>
 */
function get_console_messages(AwaitableWebpage $page): array
{
    $logs = $page->script('window.__pestBrowser.consoleLogs || []');

    if (!is_array($logs)) {
        return [];
    }

    return array_column($logs, 'message');
}

/**
 * @param  array<string, mixed>  $options
 * @param  list<string>  $initScripts
 */
function visit_with_error_init(
    string $url,
    array $options = [],
    array $initScripts = [],
): AwaitableWebpage {
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

/**
 * @param  array<string, mixed>  $options
 * @param  list<string>  $initScripts
 */
function visit_with_custom_init(
    string $url,
    array $options = [],
    array $initScripts = [],
): AwaitableWebpage {
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
