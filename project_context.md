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
4.  **Offline SQLite Synchronization Engine**: `commit.db` seamlessly mirrors dynamic Convex states locally, providing absolute resilience during offline use.
    *   **Saga Pattern vs 2PC**: We use the `TripleWriteOrchestrator` to manage a "Cloud ➔ Disk ➔ Hardware" Saga. This avoids the "Two Generals' Problem" and ensures that if the hardware step (Phase 3) fails, the app informs the user and triggers an automatic or manual rollback.
    *   **Full Coverage Migration**: 100% of critical write paths have been migrated to the Saga Orchestrator:
      - **Commitment Creation** (`useCommitTask.ts`)
      - **Calendar Temporal Shifts** (`schedules.tsx`)
      - **Task & Instance Deletion** (`useTaskActions.ts`): Differentiates between parent commitment removal (`deleteTask`) and individual temporal occurrence removal (`deleteInstance`). 
      - **Verification, Waivers, Strict Mode, & Help** (`useEventDetail.ts`): Orchestrates concise instance-level actions (Delete, Strict Mode, Duplicate, Help). **CRITICAL**: Must call `deleteInstance` for individual events to avoid Convex ID type mismatches (tasks vs taskInstances).
      - **Geofence Destination Pivots** (`EventDetailLocation.tsx`)
      - **Blocklist Configuration Updates** (`BlocklistView.tsx`)
    *   **Instance-Dependent Architecture (V12)**: The local SQLite schema has ZERO foreign key constraints. 
      - **Rationale**: The Convex backend intentionally preserves manually-edited instances after parent task deletion. Removing FK constraints allows the local cache to mirror this "Orphan" survival natively.
      - **Corruption Prevention**: Removing FKs eliminated the need to toggle `PRAGMA foreign_keys` during writes. Since PRAGMA changes are ignored inside transactions, toggling them was the #1 cause of 'malformed disk image' race conditions.
      - **Write Safety**: All writes now use clean `withTransactionAsync()` blocks without stateful connection-level PRAGMA gymnastics.
    *   **Chaos Engineering & Resilience Testing**:
        - **Chaos Suite**: We have an in-app `(dev)/chaos.tsx` control panel managed by `useChaosStore.ts`.
        - **Fault Points**: Granular injection points (`faultCloudWrite`, `faultDiskWrite`, `faultHardware`, `faultCloudUndo`) are embedded into the `TripleWriteOrchestrator` execution loop.
        - **Production Safety**: The `ChaosFab` debug button is only rendered in `__DEV__` mode to prevent leakage to end-users.
    *   **Amnesia & Warm Boot Mechanics**: At launch, the `HydrationEngine` reads a SecureStore token. If blank (Amnesia), it downloads an absolute snapshot of active data and rebuilds local tables instantly ("Fast-Path"). If present (Warm), it requests only highly-optimized Deltas from Convex.
    *   **Immutable Transaction Ingestion (Ghost Handling)**: The engine ingests these Delta payloads directly into SQLite via `withTransactionAsync()`. It natively intercepts "Ghost Instances" (historical completion logs from tasks the user previously deleted) by temporarily suspending `PRAGMA foreign_keys = OFF`. This precisely mirrors UI-based deletions, allowing the local calendar state to correctly display historical tasks without triggering violent SQLite constraint violations (`ON DELETE CASCADE`).
5.  **Native Permission Engine (`usePermissions.ts`)**: Serves as the reactive source of truth for the app's hardware/OS permission state. 
    *   **Lifecycle-Aware**: Listens for `AppState` changes to automatically re-audit enforcers whenever the app is foregrounded.
    *   **Full 7-Gate Audit**: Performs high-speed, real-time audits of Accessibility, Overlay, Battery, **Location (Precise), Camera, Notifications, and Exact Alarms** via the native `EnforcementModule`.
    *   **Fail-Closed & High-UX Dashboard**: Injects a high-performance, reactive "Permissions Missing" block into the `CommitsScreen`.
        *   **Warmup Rule**: Employs a 3-second startup delay to prevent UI flashing and ensure a "quiet" boot.
        *   **Kinetic Layout**: Utilizes Reanimated 3 spring transitions (snappy configuration) to slide the dashboard into view without blocking interaction.

---

## Navigation & Performance Architecture

1.  **"Reveal-Stack" Strategy (Pop-Centric)**:
    *   **Context**: The `(main)` group (Dashboard, Calendar, Commits) is a high-cost layout due to native components like `CalendarKit` and `GoogleMaps`.
    *   **The Golden Rule**: Once the `(main)` group is mounted, it should NEVER be unmounted during standard usage. Navigating to setup screens (like `(create-commit)`) MUST use `router.push()` to layer the new screen on top.
    *   **The Return Pattern**: Returning to a previous screen (e.g., from `time-set` to `final` or `final` to `main`) MUST use `router.back()` or `router.dismissAll()`.
    *   **The Result**: This prevents redundant instantiation of native components, eliminates 1-11s re-initialization delays, and correctly triggers "Slide Left" (Revealing) animations instead of "Slide Right" (Entering) animations.

    *   **Loading Skeleton**: To prevent UI jank during the first frame of heavy native components (like the Calendar), use a data-driven skeleton (e.g., `useSkeletonAnimation.ts`) that waits for data to arrive but adds a small (~250ms) "Native Draw Buffer" before fading out. This ensures the native grid is fully painted before the skeleton disappears.

3.  **Buffered Commit Pattern**:
    *   **Context**: High-frequency UI interactions (e.g., geofence radius sliders, real-time filters) should NEVER directly update a global Zustand store in real-time.
    *   **Logic**: Maintain a local kinetic state for the immediate visual layer (e.g., the map circle or numerical feedback) and only "commit" the final value to the global store on the interaction's completion event (e.g., `onSlidingComplete`).
    *   **The Result**: Drastically reduces re-render cycles in the parent navigation stack and provides a smooth 60fps interaction feel.

4.  **UI Thread Isolation (Reanimated 3)**:
    *   **Context**: Native UI components like `Switch` or `Slider` can stutter if the Javascript thread is busy with state updates (e.g., Zustand mutations).
    *   **Logic**: Use `react-native-reanimated` for all interactive components. By offloading animation logic to the UI thread, components remain responsive (60fps) even during heavy background processing.
    *   **Tactile Feedback**: Every interactive component (Toggles, Primary Buttons) must integrate `expo-haptics` (Impact Medium/Light) to provide a premium, hardware-like experience.

5.  **Gesture Handler Suspension (The "Frozen Reveal" Bug)**:
    *   **Context**: Using `freezeOnBlur: true` inside Tab or Stack navigators causes the Android/iOS native layers to suspend the active view hierarchy. When the screen thaws, `react-native-gesture-handler` (especially `PanGestureHandler` used in drag-and-drop) loses its bindings to the ScrollView, resulting in "floating" visual elements that fail to scroll lock or move proportionally.
    *   **Logic**: Always set `freezeOnBlur: false` on screens or navigators that rely on continuous native gesture tracking. Memory optimization should never compromise core interactive components.
    *   **Result**: Calendar events drag and snap smoothly without scrolling the background, regardless of back-and-forth navigation.
