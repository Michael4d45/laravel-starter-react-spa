# Laravel React SPA

A modern, high-performance **Laravel 12 + React 19** Single Page Application featuring an **Effect-based architecture**, **type-safe API client**, **real-time WebSockets**, **PWA capabilities**, and **Google OAuth integration**.

---

## 🚀 Tech Stack

### Backend (Laravel 12)
- **PHP 8.5+** with strict typing and modern features.
- **Laravel 12** - Streamlined API-first framework.
- **Sanctum 4** - Token-based API authentication.
- **Socialite 5** - Google OAuth integration.
- **Reverb 1.7** - First-party WebSocket server for real-time features.
- **Spatie Laravel Data** - DTOs with auto-validation and TypeScript generation.
- **Filament 4** - Advanced admin panel.
- **Pest 4** - Modern testing suite with browser testing support.

### Frontend (React 19)
- **React 19** - Optimized UI with the new React Compiler.
- **React Router 7** - Declarative routing with pre-fetching loaders.
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
- **Type Safety**: PHP Data classes automatically generate TypeScript **Effect Schemas** via `spatie/laravel-typescript-transformer`.

### Frontend: Effect-Based Data Management
The frontend leverages the **Effect** library to handle side effects, ensuring type safety and explicit error handling.
- **API Client**: A singleton (`lib/apiClientSingleton.ts`) that returns tagged unions (`Success | ValidationError | ParseError | FatalError`).
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
```bash
# Start Reverb server (required for real-time features)
php artisan reverb:start

# Or use the dev script
composer run dev

# Or use tmux-dev.sh for a complete 5-panel development environment
./tmux-dev.sh          # Starts: logs, backend, frontend, queue, reverb
./tmux-dev.sh --docker # Adds docker panel as 6th pane
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
5.  **Type Sync**: Run `php artisan typescript:transform` to update frontend schemas.
6.  **Frontend**: 
    - Add the endpoint to `apiClientSingleton.ts`.
    - Create the React component and loader.
    - Register the route in `router.tsx`.
7.  **Testing**: Write Pest feature or browser tests.

---

## 📦 Getting Started

### Prerequisites
- PHP 8.5+
- Node.js 18+
- Composer & npm

### Installation
```bash
# 1. Setup backend & frontend
composer run setup

# 2. Run development servers (Vite + Laravel + Queue)
composer run dev
```

### Key Commands
- `php artisan typescript:transform` - Sync PHP types to TypeScript.
- `php artisan reverb:start` - Start the WebSocket server for real-time features.
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
│   └── types/            # Generated Effect Schemas
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
