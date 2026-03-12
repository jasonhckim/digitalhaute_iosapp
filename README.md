# Digital Haute - Wholesale Fashion Buyer App

A React Native (Expo) mobile app for fashion boutique owners to manage wholesale purchases, track inventory, scan product labels with AI, and export to Shopify.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Firebase account
- OpenAI API key (for label scanning)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd digitalhaute_iosapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your credentials:
   - Firebase configuration (from Firebase Console)
   - OpenAI API key (from OpenAI Platform)
   - Your local IP address for `EXPO_PUBLIC_DOMAIN`

4. **Set up Firebase Admin (Server)**
   - Download your Firebase service account JSON from Firebase Console
   - Save it as `firebase-service-account.json` in the project root
   - **IMPORTANT:** Never commit this file to git (already in .gitignore)

5. **Start the development servers**
   
   Terminal 1 - Start Expo dev server:
   ```bash
   npm run expo:dev
   ```
   
   Terminal 2 - Start Express API server:
   ```bash
   npm run server:dev
   ```

6. **Open the app**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator or `a` for Android emulator

## 🏗️ Project Structure

```
digitalhaute_iosapp/
├── client/                 # React Native app
│   ├── components/        # Reusable UI components
│   ├── screens/           # Screen components (16 screens)
│   ├── navigation/        # Navigation configuration
│   ├── lib/              # Utilities (storage, auth, API clients)
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React Context providers
│   └── types/            # TypeScript type definitions
├── server/                # Express API server
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── auth.ts           # Firebase auth middleware
│   ├── db.ts             # Database connection
│   └── storage.ts        # Database operations
├── shared/               # Code shared between client/server
│   └── schema.ts         # Database schema & validation
├── data/                 # SQLite database (gitignored)
└── .env                  # Environment variables (gitignored)
```

## 🔐 Security & Environment Variables

### Required Environment Variables

**Client-side (EXPO_PUBLIC_* prefix):**
- `EXPO_PUBLIC_DOMAIN` - API server domain (e.g., `localhost:5000`)
- `EXPO_PUBLIC_FIREBASE_API_KEY` - Firebase web API key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

**Server-side:**
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key for label scanning

### Firebase Service Account

The server requires a Firebase service account JSON file for admin operations:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `firebase-service-account.json` in project root
4. This file is automatically gitignored for security

## ✨ Features

### Core Features ✅
- **User Authentication** - Firebase Auth with email/password
- **Guest Mode** - Try the app without creating an account
- **Product Management** - Add, edit, delete wholesale products
- **AI Label Scanning** - Scan product hang tags to auto-fill details (OpenAI GPT-4o)
- **Vendor Management** - Track wholesale vendors and suppliers
- **Budget Tracking** - Set and monitor budgets by season/category
- **Search & Filters** - Find products by name, vendor, category
- **CSV Export** - Export products in Shopify-compatible format
- **Settings** - Configure markup multipliers, price rounding

### Coming Soon 🚧
- Shopify Direct Export (OAuth integration)
- Push Notifications
- Offline Mode with Sync
- Team Collaboration
- Product Search by Image

## 📱 Screens

1. **Auth Flow**
   - Welcome Screen
   - Login Screen
   - Register Screen

2. **Main Tabs**
   - Dashboard - Overview stats, recent products, budgets
   - Products - Browse, search, filter products
   - Vendors - Manage vendor relationships
   - Account - Profile, settings, data management

3. **Modal Screens**
   - Add/Edit Product
   - Quick Add (AI Scanning)
   - Add/Edit Vendor
   - Add/Edit Budget
   - Product Details
   - Vendor Details
   - Settings
   - Notifications
   - Data & Privacy

## 🛠️ Development Commands

```bash
# Development
npm run expo:dev              # Start Expo dev server
npm run server:dev            # Start Express API server

# Type Checking & Linting
npm run check:types           # Run TypeScript type check
npm run lint                  # Run ESLint
npm run lint:fix              # Auto-fix ESLint issues
npm run check:format          # Check Prettier formatting
npm run format                # Format code with Prettier

# Database
npm run db:push               # Push schema changes to database

# Production Build
npm run expo:static:build     # Build static Expo app
npm run server:build          # Build server for production
npm run server:prod           # Run production server
```

## 🗄️ Database

**Type:** SQLite with Drizzle ORM

**Schema:**
- `users` - User profiles (linked to Firebase Auth)

**Client Storage:**
- Products, Vendors, Budgets stored in AsyncStorage
- Synced across app launches

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/profile` - Create/update user profile
- `GET /api/auth/me` - Get current user
- `DELETE /api/auth/account` - Delete account
- `GET /api/auth/export-data` - Export user data

### Features
- `POST /api/scan-label` - AI label scanning (OpenAI)
- `GET /api/shopify/status` - Check Shopify connection status
- `POST /api/products/export-to-shopify` - Export to Shopify (not yet implemented)

## 🧪 Testing

Currently no automated tests. Manual testing checklist:

- [ ] User registration and login
- [ ] Guest mode navigation
- [ ] Product CRUD operations
- [ ] Label scanning with camera
- [ ] Vendor management
- [ ] Budget tracking
- [ ] Search and filters
- [ ] CSV export functionality
- [ ] Settings persistence

## 📦 Production Deployment

### Pre-deployment Checklist

- [x] Move API keys to environment variables
- [x] Add `.env` to `.gitignore`
- [x] Create `.env.example` template
- [x] Hide incomplete Shopify direct export
- [x] Generate database migrations
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Set up error tracking (Sentry)
- [ ] Configure EAS Build
- [ ] Prepare App Store assets
- [ ] Review Apple App Store guidelines
- [ ] Review Google Play Store guidelines

### Build for Production

1. **Configure EAS Build** (create `eas.json`)
2. **Build iOS**
   ```bash
   eas build --platform ios
   ```
3. **Build Android**
   ```bash
   eas build --platform android
   ```

## 🔒 Security Notes

- Firebase API keys are public by design (protected by Firebase security rules)
- OpenAI API key must remain private (server-side only)
- Firebase service account JSON must NEVER be committed
- `.env` file contains sensitive data - never commit to git
- Always use HTTPS in production

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## 📞 Support

For issues or questions, contact: [Your contact information]

---

**Built with:** React Native, Expo, TypeScript, Firebase, Express, SQLite, OpenAI GPT-4o
