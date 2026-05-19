<h1 align="center">CommitT</h1>

<p align="center">
A strict, offline-first accountability enforcer for Android
</p>

## Why CommitT?

Most accountability apps rely on willpower. CommitT doesn't. It hooks directly into the Android operating system — blocking apps, locking settings, and enforcing real penalties when you break your commitments.

- **Automatic app blocking** — Instagram, YouTube, Games, etc. get blocked during active sessions
- **Settings lockout** — you cannot access device Settings or disable blocks mid-session
- **Time + Location enforcement** — commitments activate based on when and where you are
- **Random check-ins** — photo and GPS verification at unpredictable intervals
- **Multiple difficulty levels** — choose how strict the enforcement should be
- **Offline-first** — enforcement continues with zero internet dependency
- **Real penalties** — money stakes, embarrassing photos sent to friends, or CAPTCHA walls
- **Immutable commitments** — once a session starts, you cannot edit or delete it

## Vision

**Enforcement over motivation.** Willpower fades after two weeks. CommitT physically prevents quitting.

**Offline-first, always.** The enforcer runs on-device via SQLite and native Kotlin services. Cloud sync is supplementary, never required.

**Security through depth.** Three layers of Android system integration (Accessibility Service, WindowManager overlays, AlarmManager + WakeLocks) make circumvention extremely difficult.

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile** | React Native, Expo, TypeScript, Reanimated |
| **Native Android** | Kotlin, Accessibility Service, WindowManager, AlarmManager, WakeLocks |
| **Backend** | Convex (real-time sync), serverless functions, domain-driven crons |
| **Local DB** | SQLite (offline cache, WAL journaling, mutex-locked writes) |
| **Desktop** | Tauri + Vite + React |
| **Browser** | WXT-based Chrome/Firefox extension |
| **Monorepo** | Turborepo, Bun |

## Architecture

```
apps/
├── native/              # React Native + Expo mobile client
│   ├── app/             # Screens, routing, commitment creation wizards
│   ├── lib/             # Triple-Write Saga, sync engine, mutex locks
│   ├── modules/         # Native Kotlin bridges (alarm, blocker, recovery)
│   ├── components/      # UI components, design tokens, security shields
│   ├── providers/       # Resurrection provider, hydration engine
│   └── plugins/         # Expo config plugins (AndroidManifest AST patches)
├── web/                 # Tauri desktop dashboard
├── extension/           # Browser distraction blocker
└── BugReport/           # Forensic engineering case studies

packages/
├── backend/convex/      # Convex cloud backend
│   ├── db/schema.ts     # 500+ line typed schema ("The Steel Vault")
│   ├── api/             # Public mutation/query edge handlers
│   ├── core/            # Waivers, penalties, verification logic
│   └── execution/       # Watchdog cron, grading engine, penalty worker
└── docs/                # Architecture & philosophy documentation
```

## Documentation

- [committ.mintlify.app](https://committ.mintlify.app) — full documentation, architecture reference, and engineering case studies

## Security Notice

To prevent bypass abuse, the core Kotlin anti-circumvention heuristics and penalty execution engines remain closed-source. This repository contains the public-facing architecture, native bridges, and synchronization layer.

## Acknowledgements

- [Convex](https://convex.dev) — real-time serverless backend
- [Expo](https://expo.dev) — React Native development platform
- [Reanimated](https://docs.swmansion.com/react-native-reanimated/) — hardware-accelerated animations
