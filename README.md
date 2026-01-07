# Laravel React SPA

A modern **Laravel 12 + React 19** Single Page Application with **Effect-based data loading**, **PWA capabilities**, and **TypeScript** throughout. This project demonstrates best practices for building scalable web applications using cutting-edge technologies.

## 🚀 Tech Stack

### Backend
- **Laravel 12** - PHP web framework
- **Filament 4** - Admin panel and TALL stack components
- **Laravel Sanctum** - API authentication
- **Laravel Socialite** - OAuth integration (Google)
- **Spatie Laravel Data** - Data transformation layer
- **Spatie TypeScript Transformer** - TypeScript type generation
- **Pest** - Modern PHP testing framework
- **Laravel Boost** - Development guidelines and tools
- **Log** - Wide Events for logging, [michael4d45/context-logging](https://github.com/Michael4d45/Context-Logging)

### Frontend
- **React 19** - Modern React with latest features
- **React Router 7** - Client-side routing
- **Effect** - Functional programming for async operations and API client
- **TypeScript** - Static type checking
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Beautiful icons
- **React Compiler** - Automatic memoization optimization
- **Effect-based HttpApiClient** - Type-safe API interactions using `@effect/platform`

### Development & Build Tools
- **Vite 7** - Fast build tool and dev server
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Playwright** - Browser testing
- **PWA Support** - Offline functionality with Workbox

## 📦 Key Features

- ✅ **Effect-Based Architecture** - Modern functional programming approach
- ✅ **Type Safety** - Full TypeScript integration between frontend and backend
- ✅ **PWA Ready** - Offline support, service workers, and app installation
- ✅ **Modern Authentication** - Laravel Sanctum + Social OAuth
- ✅ **API-First Design** - JSON API with schema validation
- ✅ **Component Architecture** - Reusable React components with proper separation
- ✅ **Testing Suite** - Pest for backend, Playwright for browser testing

## 🏗️ Architecture

This application uses a modern, scalable architecture:

1. **Laravel Backend** - RESTful API with Data classes and Actions
2. **React Frontend** - Component-based UI with Effect for data management
3. **Type Safety** - End-to-end TypeScript with schemas generated from PHP classes
4. **PWA Features** - Service workers and offline capabilities
5. **Build Optimization** - Vite with code splitting and asset optimization

## 🛠️ Getting Started

### Prerequisites
- PHP 8.5+
- Node.js 18+
- Composer
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd laravel-react-spa
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Install Node dependencies**
   ```bash
   npm install
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Database setup**
   ```bash
   php artisan migrate
   ```

6. **Build assets**
   ```bash
   npm run build
   ```

### Development

Start the development servers:
```bash
composer run dev
```

This will start:
- Laravel server
- Vite dev server
- Queue worker
- Hot reload for both frontend and backend

#### Development Scripts

**Composer Scripts:**
- `composer run setup` - Complete project setup (install deps, generate key, migrate DB, build assets)
- `composer run dev` - Start development servers with hot reload
- `composer run test` - Run PHP tests with configuration clearing

**NPM Scripts:**
- `npm run build` - Build production assets with Vite
- `npm run build:ssr` - Build for server-side rendering
- `npm run dev` - Start Vite development server
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run lint` - Run ESLint with auto-fix
- `npm run types` - Check TypeScript types

**Development Utilities:**
- `./tmux-dev.sh` - Create TMUX session with 3-panel dev environment (logs, backend, frontend)
  - Use `--docker` to include Docker panel
  - Use `--no-attach` to create session without attaching
- `./bin/check-hanging-tests.sh` - Identify hanging or non-completing browser tests
- `./bin/clear-logs.sh` - Clear all application log files
- `./bin/format-logs.sh [file]` - Format and monitor Laravel logs with syntax highlighting
- `./bin/format-sql.sh [file]` - Format and monitor SQL queries with syntax highlighting

### Production Build

```bash
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 🧪 Testing

Run the test suite:
```bash
php artisan test
```

## 📱 Progressive Web App (PWA)

This application includes PWA features:
- **Offline Support** - Cached assets and API responses
- **App Installation** - Add to home screen capability
- **Background Sync** - Queue requests when offline
- **Push Notifications** - Ready for implementation

## 🔧 Development Guidelines

### Code Style
- **PHP**: PSR-12 standards with strict type checking
- **TypeScript**: Strict mode with ESLint and Prettier
- **CSS**: Tailwind utility classes with custom components

### Architecture Patterns
- **Actions** - Single responsibility classes for business logic
- **Data Classes** - Type-safe data transformation
- **Effect** - Functional programming for side effects
- **Components** - Reusable, typed React components

### Dependency Usage
Based on code analysis, dependencies are ranked by usage:

**Most Used:**
- React/React DOM (every component)
- Effect (HTTP client, async operations)
- React Router (navigation)
- Tailwind CSS (styling)
- clsx/tailwind-merge (conditional styling)

**Build Tools:**
- Vite, TypeScript, ESLint, Prettier

**Specialized:**
- Workbox (PWA), Playwright (testing), Laravel packages

## 📊 Project Structure

```
├── app/                  # Laravel application code
│   ├── Actions/          # Business logic actions
│   ├── Data/             # Data transformation classes
│   └── Models/           # Eloquent models
├── resources/
│   ├── js/               # React application
│   │   ├── components/   # Reusable UI components
│   │   ├── features/     # Feature-specific code
│   │   ├── lib/          # Utilities and API client
│   │   ├── stores/       # State management stores
│   │   └── types/        # TypeScript definitions and generated schemas
│   ├── css/              # Stylesheets
│   └── views/            # Blade templates
├── routes/               # API and web routes
├── tests/                # Test suites
│   ├── Feature/          # Feature tests
│   └── Browser/          # Browser tests
└── vite.config.js        # Build configuration
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
