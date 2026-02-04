# Digital Haute

## Overview

Digital Haute is a premium fashion wholesale management mobile application built for boutique buyers. The app enables users to track products, manage vendor relationships, monitor budgets, and track deliveries with a sophisticated, luxury-inspired interface.

The application uses a React Native (Expo) frontend with an Express backend, designed primarily for iOS with web support. It features a "Luxurious Editorial" aesthetic with gold accents on white backgrounds, mimicking high-end fashion magazine layouts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React Native with Expo SDK 54 (New Architecture enabled)
- **Navigation**: React Navigation v7 with native stack navigators
  - Bottom tab navigation with 4 main tabs: Home/Dashboard, Products, Vendors, Account
  - Modal presentations for add/edit screens
  - Native stack navigation within each tab
- **State Management**: TanStack Query (React Query) for server state, React useState for local state
- **Styling**: StyleSheet API with a custom theme system supporting light/dark modes
- **Animations**: React Native Reanimated for smooth, native-driven animations
- **Design System**: Custom component library with consistent theming (gold brand colors, typography scale, spacing tokens, shadows)

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **Server**: Node.js with HTTP server
- **API Pattern**: RESTful API structure (routes prefixed with `/api`)
- **CORS**: Dynamic origin handling for Replit domains and localhost development

### Data Storage

- **Client-Side**: AsyncStorage for local persistence (products, vendors, budgets)
- **Server-Side**: PostgreSQL database with Drizzle ORM
- **Schema**: Drizzle schema definitions in `shared/schema.ts` with Zod validation via `drizzle-zod`
- **Current Implementation**: MemStorage class provides in-memory storage with interface for future database migration

### Key Design Patterns

- **Path Aliases**: `@/` maps to `./client`, `@shared/` maps to `./shared`
- **Component Structure**: Presentational components in `client/components/`, screens in `client/screens/`
- **Navigation Structure**: Each tab has its own stack navigator, wrapped in a root stack for modals
- **Type Safety**: TypeScript throughout with strict mode enabled

### Mobile-Specific Features

- Haptic feedback on interactions
- Keyboard-aware scroll views with platform-specific handling
- Safe area handling for notches and home indicators
- Tab bar with blur effect on iOS
- Image picker integration for product photos
- **AI Label Scanning** - Quick Add feature uses GPT-5.2 vision to extract product info from hang tags/labels

## External Dependencies

### Core Services

- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations

### Key Libraries

- **UI/UX**: expo-linear-gradient, expo-blur, expo-haptics, expo-image
- **Forms**: expo-image-picker for product photos
- **Fonts**: @expo-google-fonts/nunito
- **Storage**: @react-native-async-storage/async-storage
- **HTTP**: Native fetch with custom apiRequest wrapper

### Build & Development

- **Bundler**: Metro (via Expo)
- **Build Tools**: esbuild for server bundling, custom build script for static web builds
- **Type Checking**: TypeScript with Expo base config
- **Linting**: ESLint with Expo config and Prettier integration