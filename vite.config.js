import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { laravelDataTypes } from '@michael4d45/effect-schema-generator/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // Single dev URL: hot file, script tags, and HMR. From VITE_DEV_SERVER_URL or built from APP_*.
    const s = env.APP_SCHEME || 'http';
    const h = env.HOST_NAME || 'localhost';
    const p = env.APP_PORT || '80';
    const built = `${s}://${h}${p ? `:${p}` : ''}`;
    const devServerUrl = env.VITE_DEV_SERVER_URL || built;
    let parsed;
    try {
        parsed = new URL(devServerUrl);
    } catch {
        parsed = new URL(built);
    }
    const hmrClientPort = parsed.port
        ? Number(parsed.port)
        : parsed.protocol === 'https:'
          ? 443
          : 80;

    const manifestIcons = [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ];
    const publicIcons = [
        { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ];

    return {
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
            laravelDataTypes(),
            VitePWA({
                // Make the PWA plugin build to the same place as laravel/vite-plugin
                buildBase: '/build/',

                // Define the scope and the base so that the PWA can run from the
                // root of the domain, even though the files live in /build.
                // This requires the service worker to be served with
                // a header `Service-Worker-Allowed: /` to authorize it.
                scope: '/',
                base: '/',

                registerType: 'autoUpdate',
                // Do not use the PWA with dev builds.
                devOptions: {
                    enabled: false,
                },

                // The Vite PWA docs suggest you should use includeAssets for
                // icons that are not in the manifest. But laravel/vite-plugin
                // does not use a public dir in the build - it relies on
                // Laravel's. If we add this as a publicDir to vite's config
                // then vite-plugin-pwa finds everything in public (eg if you are
                // using telescope then all its assets get cached). It then adds
                // these assets to the service worker with the `/build` prefix,
                // which doesn't work. I found it easiest to leave this empty
                // and use `additionalManifestEntries` below.
                includeAssets: [],

                workbox: {
                    // Add all the assets built by Vite into the public/build/assets
                    // folder to the SW cache.
                    globPatterns: [
                        '**/*.{js,css,html,ico,jpg,png,svg,woff,woff2,ttf,eot}',
                    ],

                    // Define the root URL as the entrypoint for the offline app.
                    // vue-router can then takes over and shows the correct page
                    // if you are using it.
                    navigateFallback: '/',

                    // Stops various paths being intercepted by the service worker
                    // if they're not available offline.
                    navigateFallbackDenylist: [/^\/admin/, /^\/api/],

                    // Add some explicit URLs to the SW precache. This helps us
                    // work with the laravel/vite-plugin setup.
                    additionalManifestEntries: [
                        // Cache the root URL to get hold of the PWA HTML entrypoint
                        { url: '/', revision: `${Date.now()}` },

                        // Cache the icons defined above for the manifest
                        ...manifestIcons.map((i) => {
                            return { url: i.src, revision: `${Date.now()}` };
                        }),

                        // Cache the other offline icons defined above
                        ...publicIcons.map((i) => {
                            return { url: i.src, revision: `${Date.now()}` };
                        }),
                    ],
                },
                manifest: {
                    // Metadata
                    name: 'React SPA',
                    short_name: 'React SPA',
                    description: 'React SPA built with Laravel and Vite',
                    theme_color: '#000000',
                    background_color: '#000000',
                    orientation: 'portrait',
                    display: 'standalone',
                    scope: '/',
                    start_url: '/',
                    id: '/',

                    // These icons are used when installing the PWA onto a home screen
                    icons: [...manifestIcons],
                },
            }),
            ...(process.env.ANALYZE
                ? [
                      visualizer({
                          filename: 'reports/stats.html',
                          open: false,
                          gzipSize: true,
                          brotliSize: true,
                      }),
                  ]
                : []),
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
            host: env.VITE_DEV_HOST || false,
            port: Number(env.VITE_DEV_PORT || 5173),
            strictPort: true,
            origin: devServerUrl,
            hmr: {
                host: parsed.hostname,
                protocol: parsed.protocol === 'https:' ? 'wss' : 'ws',
                clientPort: hmrClientPort,
                port: Number(env.VITE_DEV_HMR_PORT || 5173),
                path: '/vite-hmr',
            },
            watch: {
                ignored: [
                    '**/.github/**',
                    '**/.vscode/**',
                    '**/tests/**',
                    '**/database/**',
                    '**/reports/**',
                    '**/mago.toml',
                    '**/storage/framework/views/**',
                ],
            },
        },
    };
});
