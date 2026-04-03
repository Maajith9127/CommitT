# 🗂️ MASTER MODULE INDEX

This is the exact layout of the repository. Use this to instantly know where code lives before you write any tools or commands.

### `apps/native/` (The Mobile Enforcer App)
*   **`/app/`** — React Native frontend screens driven by Expo Router.
*   **`/stores/`** — Massive Zustand state machines (e.g., `useTaskDraftStore.ts` for step-by-step UI wizards).
*   **`/modules/blocker-module/`** — Kotlin Android Accessibility Service for banning user apps and checking layout.
*   **`/modules/scheduler-module/`** — Kotlin math and AlarmManager APIs to bypass Android Doze mode.
*   **`/modules/app-lister-module/`** — Native extractor to pull icons of installed Android apps.
*   **`/modules/enforcement-module/`** — Centralized native engine for deep-OS permission auditing (Accessibility, Overlay, etc.).
*   **`/modules/alarm-module/`** — Direct bridge to trigger notifications.

### `apps/web/` (The Desktop Dashboard)
*   **`/src/`** — Vite React UI for managing commitments from a laptop. Also packaged for desktop via Tauri.

### `packages/backend/` (The Server / Central Authority)
*   **`/convex/db/`** — Contains `schema.ts`. Maps the exact database format.
*   **`/convex/config/`** — Contains `enums.ts`. All standardized literal types. **Modify this first before doing anything else.**
*   **`/convex/core/verification/`** — Logic validating if the user "Passed" (GPS matching, photo metadata analysis).
*   **`/convex/core/penalties/`** — Logic executing punishments if a user "Failed" (Emails, publishing logs).
*   **`/convex/core/waivers/`** — Logic for earning forgiveness (e.g., executing CAPTCHAs).

### `packages/` (Shared Monorepo Libraries)
*   **`config/`** — Core linting, formatting, TS types.
*   **`env/`** — Type-safe Zod models preventing startup without correct `.env` files.
*   **`telemetry/`** — Cross-platform metrics tools.

---

# 🚦 AI READING PROTOCOL: How to Route Your Queries

STOP! Before reading the rest of this file or exploring the repository, determine your exact objective based on the user prompt. Use this routing guide to know exactly what to read and what to ignore.

## Core Dependency Rules
1. **Backend Types Dictate Everything**: If you add a new verification style, penalty, or status, you MUST start by updating `packages/backend/convex/config/enums.ts`. All apps (Native, Web, Server) depend on these shared Zod/Convex literal types.
2. **Native Blocking is Offline**: The Kotlin Native modules (`blocker-module`, `scheduler-module`) do NOT talk to Convex directly. They read from a localized SQLite mirror (`commit.db`). Therefore, backend schema changes do not auto-propagate to native execution unless the local sync logic is updated.
3. **UI heavily relies on Zustand**: React Native screens in `apps/native/app` are mostly view-layers. All complex wizard logic and multi-step validation live in `apps/native/stores`.

---

## Direct Routing Guide: "If the user asks to..."

### 1. Modify Database Fields, Rules, or Backend Logic
*   **DO READ**: `packages/backend/convex/db/schema.ts` and `packages/backend/convex/config/enums.ts`.
*   **SKIP**: `apps/` entirely.

### 2. Fix or Add a Mobile UI Screen / Navigation Rule
*   **DO READ**: `apps/native/app/` (Expo Router) and `apps/native/stores/` (Zustand state).
*   **SKIP**: Kotlin Native modules, `apps/web/`, and `packages/backend/`.

### 3. Change Android Blocking, Geofencing, or the Alarm System
*   **DO READ**: The Kotlin source in `apps/native/modules/blocker-module/` or `apps/native/modules/scheduler-module/`.
*   **SKIP**: `apps/web/`, `packages/backend/`, and most of the React Native UI.

### 4. Adjust the Desktop/Web Dashboard
*   **DO READ**: `apps/web/` (Vite, Tauri config, TanStack Router setup).
*   **SKIP**: `apps/native/` completely.

### 5. Change How Evidence/Penalties are processed
*   **DO READ**: `packages/backend/convex/core/verification/` or `packages/backend/convex/core/waivers/`.
*   **SKIP**: Any UI code. Validation occurs exclusively on the backend.

---

# Project Context: CommitT Monorepo

CommitT is a sophisticated behavioral accountability and enforcement platform. It uses a "Fail-Closed" security architecture to ensure that commitments—physical (location-based) or digital (application-based)—are durable and resistant to circumvention.

---

## Command Registry (Execute via `bun` from Root)

### Development and Setup
- `bun run dev`: Standard development mode. Starts all necessary sub-services via Turbo.
- `bun run dev:native`: Expeditiously starts the Expo development environment for the mobile app.
- `bun run dev:web`: Starts the Vite/Tauri development server for the desktop dashboard.
- `bun run dev:server`: Starts the Convex backend (synced with the cloud).

### Native Enforcer Specifics (apps/native)
- `npx expo start`: Starts the local development server for the Expo app.
- `npx expo run:android`: Executes a native Android build and launches it on a device/emulator.

---

## Data Integrity and State Machine

The system's core is the Convex backend, which enforces a strict pipeline for behavioral commitments.

- **States**: `pending` -> `proceeding` -> `failed` -> `waiver_active` -> `penalized` / `waived` / `proceeded`
- **Immutability Strategy**: When a task instance is generated, the backend creates an immutable "Snapshot" of the parent task's rules. Editing the parent task cannot lower the penalty of an active instance.
- **The Steel Vault**: Many task instances have a `strict_until` timestamp. The backend literally rejects any deletion or modification attempts by the user until that time has passed.

---

## Security Protocols (Anti-Cheat / Offline Protection)

1.  **BlockerAccessibilityService.kt**: Analyzes active apps to ban restricted intents, halts uninstall attempts by kicking the user to the Lock Screen, and requires 1Hz GPS verification to prevent location spoofing.
2.  **AlarmScheduler.kt**: Writes upcoming alarms into un-encrypted Device-Protected (DE) Storage so they can fire even before the user types their PIN into a freshly restarted phone.
3.  **Hardware Execution Shield**: Located in `_layout.tsx`, this system halts execution if Root, Jailbreak, Mock Location providers, or Developer Options are detected on the host device.
4.  **Offline SQLite**: `commit.db` mirrors the active Convex commitment states down to the native app, verifying rules physically during Airplane mode.
5.  **Native Permission Engine (`usePermissions.ts`)**: Serves as the reactive source of truth for the app's hardware/OS permission state. 
    *   **Lifecycle-Aware**: Listens for `AppState` changes to automatically re-audit enforcers whenever the app is foregrounded.
    *   **Deep OS Audits**: Offloads all system-deep queries (Accessibility, Overlay, and **Battery Optimization/Doze Mode**) to the `EnforcementModule` via the native bridge.
    *   **Fail-Closed Dashboard**: Injects a high-visibility, reactive "Permissions Missing" block into the `CommitsScreen` if any of the 7 critical hardware gates are offline.
