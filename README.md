# Laravel React SPA

A **Laravel 13 + React 19** single-page application with an Effect-based frontend, type-safe API client, Reverb WebSockets, PWA support, and Google OAuth.

---

## Tech Stack

### Backend (Laravel 13)
- **PHP 8.5+** with strict typing.
- **Laravel 13** — API + SPA shell.
- **Sanctum 4** — cookie/session SPA authentication (`statefulApi()`).
- **Socialite 5** — Google OAuth.
- **Reverb 1.11** — first-party WebSocket server.
- **Spatie Laravel Data** — DTOs with validation; TypeScript Effect schemas via `effect-schema-generator`.
- **Filament 5** — admin panel.
- **Pest 5** — unit, feature, and browser tests.

### Frontend (React 19)
- **React 19** with the React Compiler.
- **React Router 8** — loaders fetch data before render.
- **Effect** — type-safe async work and tagged error handling.
- **Laravel Echo** — Reverb client; private channels authenticate over `/api/broadcasting/auth`.
- **Tailwind CSS 4** — CSS-first utilities.
- **Dexie/IDB** — IndexedDB cache for offline use.
- **Lucide React** — icons.

---

## Architecture

### Backend: feature folders
Business logic lives in single-responsibility **Action** classes under `app/Features/{Feature}/Actions/`. Each feature owns its routes, requests, and responses.

- **Shared DTOs**: `app/Data/` (models and event payloads used across features).
- **Feature contracts**: `app/Features/{Feature}/Requests/` and `Responses/`.
- **Type sync**: PHP Data/enum classes generate TypeScript Effect schemas (`npm run types:generate` → `resources/js/schemas/`).

### Frontend: Effect-based data
- **API client**: helpers in `resources/js/lib/apiCore.ts`. Calls return tagged results (`Success`, `ValidationError`, `AuthenticationError`, `ParseError`, and related variants). Session cookies and CSRF (`/sanctum/csrf-cookie`) authenticate requests.
- **Loaders**: React Router loaders fetch before the page renders.
- **Offline**: API responses are cached in IndexedDB.

---

## Authentication

Cookie/session SPA auth, not API bearer tokens.

1. **Email/password** — `Auth::attempt()` establishes a Laravel session; subsequent API calls use the session cookie.
2. **Google OAuth** — Socialite callback logs the user in, then redirects to `/` or `/profile` with `?auth=success`.

### Auth flow
- **Session**: Sanctum SPA (`auth:sanctum` on API routes with the `web` guard).
- **Client cache**: `AuthManager` stores a user snapshot in `localStorage` for UI and trusted offline restore — not an access token.
- **Reactivity**: `AuthContext` / `useAuth`.
- **WebSockets**: Echo authorizes private channels via the same sessioned API.

---

## Real-time (Laravel Reverb)

Events that implement `ShouldBroadcast` are pushed to connected clients. Echo (`resources/js/lib/echo.ts`) connects to Reverb and authenticates private channels with `POST /api/broadcasting/auth`.

Vite, queue, and Reverb run as Lerd workers (see [`.lerd.yaml`](./.lerd.yaml)):

```bash
lerd setup --all        # start configured workers
lerd worker list
lerd worker start reverb
```

Feature tests fake broadcasting (no Reverb process required). Browser tests cover the UI. See `tests/Browser/RealtimeTest.php`.

---

## Development workflow

When adding a feature:

1. **Database** — migration and Eloquent model.
2. **Feature** — Actions, Requests/Responses, and `routes.php` under `app/Features/{Feature}/`. Shared shapes go in `app/Data/`.
3. **Routes** — `require` the feature routes from `routes/api.php` or `routes/web.php`.
4. **Types** — `npm run types:generate`.
5. **Frontend** — feature API module, page + loader, route in `resources/js/router.tsx`.
6. **Tests** — Pest feature and/or browser tests.

---

## Getting started

### Prerequisites
- [Lerd](https://lerd.sh/) (PHP 8.5, Node, Postgres, Redis, Mailpit)
- Composer and npm (provided by Lerd)

### Installation

```bash
# Link the site, write .env, migrate, and start workers
lerd setup --all

# Generate frontend Effect schemas from PHP Data classes
npm run types:generate
```

Open **https://react-spa.test**. Dashboard: **http://lerd.localhost**. Mail: **http://127.0.0.1:8025**.

Stack and env live in [`.lerd.yaml`](./.lerd.yaml). Re-run `lerd env` after changing `env_overrides`.

### Browser tests

Pest browser tests run Chromium **inside** the PHP-FPM container. One-time:

```bash
lerd pest:browser install
lerd pest:browser doctor
```

Browser tests ignore Vite’s `hot` file and use compiled assets, so run `npm run build` before the browser suite (or after frontend changes). Re-run `lerd pest:browser install` after bumping Playwright.

### Key commands

| Command | Purpose |
| --- | --- |
| `php artisan test` / `composer test` | Pest (unit, feature, browser) |
| `composer phpstan` | PHPStan (level 9, including tests) |
| `vendor/bin/mago lint` / `vendor/bin/mago format` | PHP lint / format (analyzer is off) |
| `npm run types:generate` | PHP → TypeScript Effect schemas |
| `vendor/bin/model-schema check` | Migration / model / Filament drift |
| `lerd worker list` | Vite, queue, Reverb workers |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run types` | `tsc --noEmit` |

---

## PWA and offline
- **Service worker**: `vite-plugin-pwa`.
- **Cache**: IndexedDB via `resources/js/lib/apiCache.ts`.
- **Offline banner**: shown when the connection drops.

---

## Project structure

```
├── app/
│   ├── Data/             # Shared DTOs (models, event payloads)
│   ├── Enums/
│   ├── Features/         # Actions, feature routes, requests, responses
│   ├── Filament/         # Admin panel
│   └── Models/
├── resources/js/
│   ├── components/
│   ├── features/         # Pages, feature API modules, AuthContext
│   ├── hooks/
│   ├── lib/              # apiCore, Echo, IndexedDB cache
│   └── schemas/          # Generated Effect schemas (gitignored)
├── routes/
│   ├── api.php           # Requires feature route files
│   ├── channels.php
│   └── web.php           # SPA shell, login/register, Google OAuth
├── tests/
│   ├── Unit/
│   ├── Feature/
│   └── Browser/
└── vite.config.js
```

---

## License

[MIT](LICENSE).
