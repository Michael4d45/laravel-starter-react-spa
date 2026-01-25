import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { laravelDataTypes } from './laravelDataTypes';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/main.tsx',
                'resources/css/filament/admin/theme.css',
            ],
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        laravelDataTypes({
            refactorPaginators: false,
        }),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'robots.txt', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: {
                name: 'Laravel React PWA',
                short_name: 'ReactPWA',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#000000',
                icons: [
                    {
                        src: '../pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '../pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/.*\/api\/.*$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 24 * 60 * 60, // 1 day
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /\/.*\.(js|css|html|png|svg|jpg|jpeg|gif|woff|woff2|ttf|eot)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'asset-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                            },
                        },
                    },
                ],
                navigateFallback: '/',
                navigateFallbackDenylist: [/^\/admin/, /^\/api/],
            },
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
    server: {
        /** Uncomment the following lines if you want to allow access from network */
        // host: '0.0.0.0', // Allow access from network
        // hmr: {
        //     host: '10.54.2.249', // Your local IP
        // },
        watch: {
            ignored: ['**/.github/**', '**/.vscode/**', '**/tests/**', '**/database/**', '**/mago.toml', '**/storage/framework/views/**'],
        },
    },
});
