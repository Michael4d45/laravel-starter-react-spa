<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#000000">
        <meta name="description" content="Laravel React Progressive Web App with offline support">

        <title>{{ config('app.name', 'Laravel React PWA') }}</title>

        <!-- Favicon -->
        <link rel="icon" href="{{ asset('favicon.ico') }}">
        <link rel="apple-touch-icon" href="{{ asset('pwa-192x192.png') }}">
        <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">

        <!-- Theme initialization script to prevent FOUC -->
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

        <!-- Load React app assets -->
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    </head>
    <body class="font-sans antialiased">
        <div id="app"></div>
    </body>
</html>
