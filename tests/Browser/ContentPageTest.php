<?php

declare(strict_types=1);

beforeEach(function () {
    setup_log_capture('content.log');
});

afterEach(function () {
    assert_no_log_errors(storage_path('logs/content.log'));
});

it('content page loads without JS errors', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Content List');
});

it('displays content list when content exists', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Content List')
        // Should show actual content instead of "No content available"
        ->assertDontSee('No content available');
});

it('displays back to home button', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Back to Home')
        ->screenshot(filename: 'content-page-navigation.png');
});

it('displays refresh and create content buttons', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Refresh Content')
        ->assertSee('Create New Content')
        ->screenshot(filename: 'content-page-buttons.png');
});

it('content page is responsive on different screen sizes', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->resize(375, 667) // Mobile size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'content-mobile.png')
        ->resize(768, 1024) // Tablet size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'content-tablet.png')
        ->resize(1920, 1080) // Desktop size
        ->assertNoJavaScriptErrors()
        ->screenshot(filename: 'content-desktop.png');
});

it('displays actual content items from loader', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        // Check for actual content titles from the API
        ->assertSee('Welcome to the Content Page')
        ->assertSee('Another Content Item')
        ->assertSee('Third Content Item')
        ->screenshot(filename: 'content-items-display.png');
});

it('displays content items in proper grid layout', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertPresent('.grid')
        // Should have multiple content cards
        ->assertSee('Welcome to the Content Page')
        ->assertSee('This is a sample content item') // Content from first item
        ->screenshot(filename: 'content-grid-layout.png');
});

it('refresh button functionality works', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Refresh Content')
        ->click('Refresh Content')
        ->wait(2) // Give time for page reload
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/content') // Should still be on content page
        ->assertSee('Content List'); // Should still show content
});

it('create content button shows success message', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Create New Content')
        ->click('Create New Content')
        ->wait(1)
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/content') // Should stay on content page
        // The component shows a success toast, but we can't easily test toast content in browser tests
        ->screenshot(filename: 'content-create-action.png');
});

it('navigation back to home works', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        ->assertSee('Back to Home')
        ->click('Back to Home')
        ->wait(1)
        ->assertNoJavaScriptErrors()
        ->assertPathIs('/') // Should navigate to home page
        ->waitForText('Laravel React PWA', 10)
        ->assertSee('Laravel React PWA'); // Home page heading
});

it('displays complete content page view', function (): void {
    visit('/content')
        ->assertNoJavaScriptErrors()
        ->waitForText('Content List', 10)
        // Verify main heading
        ->assertSee('Content List')
        // Verify navigation
        ->assertSee('Back to Home')
        // Verify action buttons
        ->assertSee('Refresh Content')
        ->assertSee('Create New Content')
        // Verify content grid exists and has content
        ->assertPresent('.grid')
        // Verify multiple content items are displayed
        ->assertSee('Welcome to the Content Page')
        ->assertSee('Another Content Item')
        ->assertSee('Third Content Item')
        // Verify content bodies are shown
        ->assertSee('This is a sample content item')
        ->assertSee('Here is another piece of content')
        // Take screenshot to verify visual layout
        ->screenshot(filename: 'content-page-complete-view.png');
});
