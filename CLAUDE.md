# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Texas Hold'em themed bar service mini-program monorepo consisting of three main applications:

- **Server** (`apps/server`): NestJS backend API with TypeORM, MySQL, Redis, and JWT authentication
- **Admin** (`apps/admin`): React admin dashboard with Vite, Ant Design
- **Mini-Program** (`apps/mp`): WeChat mini-program frontend

## Development Commands

### Root Level Commands
```bash
# Backend development
pnpm dev:server          # Start backend in development mode
pnpm build:server        # Build backend for production
pnpm lint:server         # Lint backend code

# Admin frontend development
pnpm dev:admin           # Start admin dashboard in development mode
pnpm build:admin         # Build admin dashboard for production
```

### Backend Commands (apps/server)
```bash
# Development
pnpm dev                 # Start with hot reload using ts-node-dev

# Database operations
pnpm migration:generate  # Generate TypeORM migration
pnpm migration:run       # Run pending migrations
pnpm migration:revert    # Revert last migration
pnpm seed               # Initialize database with seed data

# Testing and building
pnpm test               # Run Jest tests
pnpm build              # Compile TypeScript to JavaScript
pnpm start              # Start production server
```

### Admin Commands (apps/admin)
```bash
pnpm dev                # Start Vite dev server
pnpm build              # Build for production
pnpm preview            # Preview production build
```

## Architecture Overview

### Backend Architecture (NestJS)
The backend follows a modular NestJS architecture with clear separation of concerns:

**Core Modules:**
- `AuthModule`: JWT-based authentication with WeChat login integration
- `ReservationModule`: Table reservation system with status management
- `TableModule`: Table management (main/side/dining categories)
- `MenuModule`: Menu items and categories management
- `MembershipModule`: Member management with level system
- `OrdersModule`: Order processing and tracking
- `LoyaltyModule`: Points and rewards system
- `RedisModule`: Caching and session management

**Key Patterns:**
- Entity-Service-Controller pattern for each module
- TypeORM entities with relationships
- DTO validation using class-validator
- Swagger/OpenAPI documentation
- Redis for caching table status and sessions

### Authentication Flow
The authentication system uses a hybrid approach:

1. **WeChat OAuth**: Mini-program uses `wx.login()` to get temporary code
2. **Backend Verification**: Server exchanges code for WeChat session (openid)
3. **JWT Tokens**: Server issues JWT tokens with 30-day expiry
4. **Auto-refresh**: Frontend (`apps/mp/utils/auth.js`) handles silent token validation
5. **Member Association**: Users are linked to member entities for loyalty features

### Mini-Program Architecture
The WeChat mini-program follows WeChat's framework conventions:

**Key Files:**
- `app.js`: Global app configuration with auth manager integration
- `utils/auth.js`: Centralized authentication management
- `utils/request.js`: HTTP client with automatic token injection and 401 handling
- `app.json`: Page routing configuration

**Page Structure:**
- Each page has `.wxml` (template), `.js` (logic), `.wxss` (styles), `.json` (config)
- Pages use the `authManager` for login checks and user data
- Request interceptor automatically handles authentication and error states

### Database Schema Patterns
The database follows these relationship patterns:

- **Member-centric design**: Members link to reservations, orders, loyalty transactions
- **Hierarchical membership**: Levels determine discounts and benefits
- **Table state management**: Status tracking via TypeORM enums and Redis caching
- **Order-Item relationships**: Orders contain multiple menu items with quantities
- **Audit trails**: All entities have `created_at` and `updated_at` timestamps

### Theming and UI Consistency
The project uses a consistent dark theme with Texas poker aesthetic:

- **Primary color**: Gold (#fbbf24)
- **Background gradients**: Dark blue/slate tones (#0f172a to #1e293b)
- **Component patterns**: Card layouts with blur effects and subtle borders
- **Responsive units**: rpx units for WeChat mini-program compatibility

## Important Configuration

### Environment Setup
The backend requires these environment variables:
- Database connection (MySQL)
- Redis connection
- WeChat API credentials (`WX_APPID`, `WX_SECRET`)
- JWT secret key

### Database Initialization
Use `pnpm seed` to populate the database with:
- 5 membership levels (V1-V5)
- 8 tables (main/side/dining categories)
- 6 menu categories with 13 items
- 3 test members

### Authentication Integration
Pages requiring authentication should:
1. Import `authManager` from `utils/auth.js`
2. Call `authManager.checkLogin()` in `onLoad()` or `onShow()`
3. Handle login redirects for protected features
4. Use `authManager.userInfo` for user data access

### Request Handling
All API calls should use `utils/request.js` which automatically:
- Attaches Bearer tokens
- Handles 401 redirects to login
- Shows error toasts
- Provides convenience methods (`get`, `post`, `put`, `delete`)