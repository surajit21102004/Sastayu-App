# Sastayu - Home Services Super-App 🛠️✨

> **"One App with 100+ Solutions"**  
> Built with **React Native (0.86)** & **Expo SDK 57** (Compatible with **Expo Go v57.0.9**).

---

## 📱 About Sastayu

**Sastayu** is an on-demand home services platform providing 100+ vetted solutions—including AC repair & power jet servicing, plumbing, electrical diagnostics, deep home sanitization, appliance repairs, carpentry, painting, and waterproofing.

---

## 🚀 Compatibility & Tech Stack

| Component | Specification |
| :--- | :--- |
| **Framework** | React Native `0.86.3` |
| **Expo SDK** | Expo SDK `57.0.28` (`sdk-57`) |
| **Expo Go Client** | Version `57.0.9` compatible |
| **Core UI Engine** | React `19.2.3` (New Architecture Enabled) |
| **Routing** | Expo Router v57 (File-based navigation) |
| **Animations** | React Native Reanimated v4.5 |
| **Language** | TypeScript (Strict mode enabled) |

---

## 🎨 Sastayu Brand Kit Integration

The app is themed strictly following the official `Sastayu-Brand-Kit`:

* **Primary Blue (`#1E40AF`)**: Main brand identity, buttons, primary headers, active tab highlights, and splash screen background.
* **Accent Yellow (`#FBBF24`)**: Tags, badge highlights, promotional chips, and secondary accents.
* **Navy (`#0F172A`)**: Primary text on light backgrounds and high-contrast text on yellow badges.
* **White (`#FFFFFF`)**: Clean cards and contrast text on primary blue.
* **Brand Contrast Rule**: *Navy text on yellow backgrounds; white text on blue backgrounds. Never white text on yellow.*

### Asset Mapping:
* **App Icon**: `assets/images/icon.png` (Source: `Sastayu-Brand-Kit/02-App-Icon/app-icon-1024.png`)
* **Android Adaptive Foreground**: `assets/images/android-icon-foreground.png` (Source: `02-App-Icon/android-adaptive/foreground-1024.png`)
* **Android Adaptive Background**: `assets/images/android-icon-background.png` (Source: `02-App-Icon/android-adaptive/background-1024.png`)
* **Splash Icon**: `assets/images/splash-icon.png` (Source: `01-Logo/logo-mark-badge.png`)
* **Favicon**: `assets/images/favicon.png` (Source: `03-Website/favicon-128.png`)
* **Logos**: All vector SVGs and PNG variants preserved in `assets/brand/` and `assets/images/`.

---

## 📂 Project Architecture

```
1Sastayu/
├── app/                                # React Native Expo Application (Frontend)
├── be/                                 # Node.js / Express Backend (API & MySQL)
├── Sastayu-Brand-Kit/                  # Original brand assets & identity guidelines
└── Screen App/                         # UI/UX Design Reference Screens
    ├── app.json                        # Configured for SDK 57, com.sastayu.app, brand colors
    ├── package.json                    # Expo SDK 57 dependencies
    ├── tsconfig.json                   # TypeScript configuration
    ├── expo-env.d.ts                   # Expo environment typings
    ├── assets/
    │   ├── brand/                      # Full copy of Sastayu Brand Kit (SVGs & PNGs)
    │   └── images/                     # App icons, splash, logos, and tab icons
    └── src/
        ├── app/                        # Expo Router screen routes
        │   ├── _layout.tsx             # Root Layout with Splash & Tabs
        │   ├── index.tsx               # Home: Brand header, Search, Categories, Featured Cards
        │   ├── explore.tsx             # 100+ Solutions Catalog with filtering
        │   ├── bookings.tsx            # Live tracking & order history
        │   └── profile.tsx             # Account info, Brand showcase, Tech specs
        ├── components/
        │   ├── brand/
        │   │   ├── SastayuLogo.tsx     # Multi-variant brand logo component
        │   │   └── SastayuHeader.tsx   # Top bar with logo, location & notifications
        │   ├── services/
        │   │   ├── CategoryCard.tsx    # Interactive service category pill
        │   │   ├── ServiceCard.tsx     # Pricing, warranty & booking card
        │   │   └── PromoBanner.tsx     # "One App with 100+ Solutions" banner
        │   └── ui/
        │       ├── Button.tsx          # Brand-compliant button (Navy on yellow, white on blue)
        │       └── Badge.tsx           # Pill badges and tags
        ├── constants/
        │   ├── theme.ts                # Brand colors, typography tokens & insets
        │   └── services.ts             # 100+ solutions data & categories
        └── types/
            └── index.ts                # TypeScript domain models
```

---

## 🏃 Quick Start Guide

### 1. Navigate to Project
```bash
cd app
```

### 2. Start Expo Development Server
```bash
npx expo start
```

### 3. Open in Expo Go (SDK 57 / Client 57.0.9)
* **Android**: Open the **Expo Go** app on your physical Android device and scan the QR code displayed in the terminal.
* **iOS**: Scan the QR code using the iOS Camera app to launch inside **Expo Go**.
* **Web**: Press `w` in your terminal to view the responsive web build.
* **Android Emulator / iOS Simulator**: Press `a` or `i` in the terminal.
