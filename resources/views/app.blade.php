<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>

<head>
    <meta charset="utf-8">
    <meta name="viewport"
        content="width=device-width, height=device-height, initial-scale=1.0, viewport-fit=auto, user-scalable=no, interactive-widget=resizes-content" />
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <link rel="manifest" crossorigin="use-credentials" href="/build/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-title" content="React SPA" />

    {{-- Font Awesome CDN --}}
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
    </link>

    {{-- Inline script to detect system dark mode preference and apply it immediately --}}
    <script>
        (function() {
            try {
                const savedAppearance = localStorage.getItem('appearance') || 'system';
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                const shouldApplyDark = savedAppearance === 'dark' ||
                    (savedAppearance === 'system' && prefersDark);

                if (shouldApplyDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                } else {
                    document.documentElement.style.colorScheme = 'light';
                }
            } catch (e) {
                // Fallback if localStorage is not available
                document.documentElement.style.colorScheme = 'light';
            }
        })();
    </script>

    <title>{{ config('app.name', 'Laravel') }}</title>

    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/favicon.ico">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.tsx'])
</head>

<body class="font-sans antialiased">
    <div id="app"></div>
</body>

</html>
