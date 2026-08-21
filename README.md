# Laravel React SPA

A modern, high-performance **Laravel 13 + React 19** Single Page Application featuring an **Effect-based architecture**, **type-safe API client**, **real-time WebSockets**, **PWA capabilities**, and **Google OAuth integration**.

---

## 🚀 Tech Stack

### Backend (Laravel 13)
- **PHP 8.5+** with strict typing and modern features.
- **Laravel 13** - Streamlined API-first framework.
- **Sanctum 4** - Token-based API authentication.
- **Socialite 5** - Google OAuth integration.
- **Reverb 1.7** - First-party WebSocket server for real-time features.
- **Spatie Laravel Data** - DTOs with auto-validation and TypeScript generation.
- **Filament 5** - Advanced admin panel.
- **Pest 5** - Modern testing suite with browser testing support.

### Frontend (React 19)
- **React 19** - Optimized UI with the new React Compiler.
- **React Router 8** - Declarative routing with pre-fetching loaders.
- **Effect** - Functional programming library for type-safe async operations and error handling.
- **Laravel Echo** - WebSocket client with automatic authentication via Sanctum tokens.
- **Tailwind CSS 4** - Modern, CSS-first utility styling.
- **Effect-based API Client** - Type-safe communication using `@effect/platform`.
- **Dexie/IDB** - IndexedDB for robust offline data caching.
- **Lucide React** - Icon library.

---

## 🏗️ Architecture & Layers

### Backend: Action-Oriented Design
Instead of traditional controllers, business logic is encapsulated in single-responsibility **Action classes** (`app/Actions/`).
- **Data Layer**: `app/Data/` contains Models (DTOs), Requests (Validation), and Responses.
- **Type Safety**: PHP Data classes generate TypeScript **Effect Schemas** via `effect-schema-generator`.

### Frontend: Effect-Based Data Management
The frontend leverages the **Effect** library to handle side effects, ensuring type safety and explicit error handling.
- **API Client**: Effect-based helpers in `lib/apiCore.ts` that return tagged unions (`Success | ValidationError | ParseError | FatalError`).
- **Loaders**: React Router loaders fetch data *before* component rendering, eliminating "loading state" flashes.
- **Offline First**: Automatic caching of API responses in IndexedDB for seamless offline browsing.

---

## 🔐 Authentication System

The application uses a dual authentication strategy:

1.  **Email/Password**: Standard Sanctum bearer token authentication.
2.  **Google OAuth**: Integrated via Socialite. Tokens are securely passed from the server session to the SPA after callback, then stored in `localStorage`.

### Auth Flow Highlights:
- **Persistence**: Tokens and user data are managed by a singleton `AuthManager`.
- **Reactivity**: `AuthContext` provides a reactive hook (`useAuth`) to access the current session.
- **Security**: OAuth state is encrypted and timestamped to prevent replay attacks.
- **WebSocket Auth**: Echo automatically includes Sanctum tokens in private channel subscriptions.

---

## ⚡ Real-Time Features (Laravel Reverb)

The application includes full WebSocket support via **Laravel Reverb** for real-time updates.

### Setup
- **Backend**: Events implementing `ShouldBroadcast` are automatically sent to connected clients.
- **Frontend**: Laravel Echo (`lib/echo.ts`) connects to Reverb with auto-authentication.
- **Private Channels**: Echo uses Sanctum tokens to authenticate private channel subscriptions.

### Development
Vite, queue, and Reverb run as Lerd workers (see [`.lerd.yaml`](./.lerd.yaml)):

```bash
lerd setup --all        # start configured workers
lerd worker list
lerd worker start reverb
```

### Testing
Real-time features are tested using **mock broadcasting** (no Reverb required):
```php
Event::fake([TestRealtimeEvent::class]);
// ... dispatch event ...
Event::assertDispatched(TestRealtimeEvent::class);
```

See `tests/Browser/RealtimeTest.php` for examples.

---

## 🛠️ Development Workflow

When adding a new feature, follow this checklist:

1.  **Database**: Create migration and Eloquent model.
2.  **Data Layer**: Create DTOs in `app/Data/Models/`, `app/Data/Requests/`, and `app/Data/Response/`.
3.  **Business Logic**: Implement an Action class in `app/Actions/`.
4.  **API Routes**: Register the action in `routes/api.php`.
5.  **Type Sync**: Run `npm run types:generate` to update frontend schemas.
6.  **Frontend**: 
    - Add the endpoint to the feature API module.
    - Create the React component and loader.
    - Register the route in `router.tsx`.
7.  **Testing**: Write Pest feature or browser tests.

---

## 📦 Getting Started

### Prerequisites
- [Lerd](https://lerd.sh/) (PHP 8.5, Node, Postgres/PostGIS, Redis, Mailpit)
- Composer & npm (installed by Lerd)

### Installation
```bash
# 1. Link the site, write .env, migrate, and start workers
lerd setup --all

# Open https://react-spa.test (dashboard: http://lerd.localhost)
```

Stack and env live in [`.lerd.yaml`](./.lerd.yaml). Re-run `lerd env` after changing `env_overrides`. Vite, queue, and Reverb run as Lerd workers (`lerd worker list`). Mail UI: `http://127.0.0.1:8025`.

### Key Commands
- `npm run types:generate` - Sync PHP types to TypeScript Effect schemas.
- `vendor/bin/model-schema check` - Report drift between migrations, models, and Filament forms.
- `lerd worker list` - Status of Vite, queue, and Reverb workers.
- `php artisan test` - Run the Pest test suite.
- `npm run lint` - Run ESLint and Prettier.
- `npm run types` - Check TypeScript types.

---

## 📱 PWA & Offline Support
- **Service Worker**: Automatically handled by `vite-plugin-pwa`.
- **Caching**: API responses are cached using IndexedDB (`apiCache.ts`).
- **Offline Banner**: Notifies users when connection is lost.

---

## 📊 Project Structure
```
├── app/
│   ├── Actions/          # Single-responsibility business logic
│   ├── Data/             # DTOs, Requests, Responses (Type Source)
│   ├── Events/           # Broadcastable events for real-time
│   └── Models/           # Eloquent Models
├── resources/js/
│   ├── components/       # Reusable UI (Button, Input, etc.)
│   ├── contexts/         # Auth & Global state
│   ├── features/         # Feature-based pages and logic
│   ├── hooks/            # Custom React hooks (usePrivateChannel, etc.)
│   ├── lib/              # API Client (Effect), Auth Manager, Echo
│   └── schemas/          # Generated Effect Schemas
├── routes/
│   ├── api.php           # API routes
│   ├── channels.php      # Broadcasting channel authorization
│   └── web.php           # Web routes
├── tests/
│   ├── Feature/          # Backend API tests
│   └── Browser/          # E2E Pest Browser tests
└── vite.config.js        # Tailwind 4 & PWA config
```

---

## 📄 License
MIT License.
