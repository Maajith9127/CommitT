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
4.  **Provider Hierarchy Stability (Release Fix)**: 
    - **Architecture**: `SQLiteProvider` and `ConvexProvider` wrap `SecurityShield`. 
    - **Rationale**: Since `SecurityShield` performs async hardware checks on `AppState` changes (Release mode), it could briefly unmount children. Keeping Providers as outermost anchors ensures the native DB connection and WebSocket remain "immortal" and never throw `NullPointerException` or `ConnectionClosed` errors during security re-renders.
5.  **Offline SQLite Synchronization Engine**: `commit.db` seamlessly mirrors dynamic Convex states locally, providing absolute resilience during offline use.
    *   **Saga Pattern (Triple-Write)**: Every critical write follows a "Cloud ➔ Disk ➔ Hardware" Saga managed by `TripleWriteOrchestrator`. 
    *   **"Black Box" Forensics (Logger)**: 
        - **Persistent Logging**: `lib/logger.ts` saves forensic data to `commit_debug.log` using `expo-file-system/legacy`.
        - **Saga IDs**: Every transaction (e.g., `[Saga:AF72X]`) is assigned a unique ID to track its progress across all 3 layers in the logs.
        - **Audit Trail**: Captures Phase starts, successes, failures, and "Compensating Rollbacks" (Undos). This allows for post-mortem analysis of "mystery" sync failures on physical devices.
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
    *   **Amnesia, Warm Boot, & Version Recovery**: 
      - **Amnesia**: If the SecureStore token is missing, the engine performs a full re-hydration ("Fast-Path").
      - **Deltas**: Normal operation uses highly-optimized JSON Deltas from Convex. Ingested via atomic `withTransactionAsync()` blocks.
      - **Version Recovery**: If Convex returns a "Base version mismatch" (backend redeployed), the `HydrationEngine` automatically wipes the sync token, triggering an Amnesia rebuild on the next retry. This handles backend rollovers without requiring an app restart.
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

---

### Case Study: Verification UI Stabilization (April 2026)

In April 2026, the verification UI under `apps/native/components/ui/modal/` underwent a major stabilization phase to resolve synchronization lag and improve user feedback across different task types.

#### 1. Stable Hook Architecture
The `useEventDetail` hook was refactored to serve as the unified orchestrator for the Event Detail Modal. It merges live Convex subscriptions with optimistic local state. 

**Key Fix**: Resolved a critical `TypeError` by ensuring a complete and stable set of interaction handlers (`handleVerifyCondition`, `handleStatusPress`, `handleOpenMenu`, etc.) are always exported, preventing runtime crashes during state transitions.

#### 2. Granular Failure Feedback
A new "Retrospective Feedback" system was implemented. 
*   **Mechanism**: The `handleStatusPress` method traverses the checkpoint history of a task instance to find the specifically active or most recent failure.
*   **UX**: Tapping a "Failed" status icon (red reload/cross) now triggers a `ConfirmationModal` that displays the exact reason for failure (e.g., *"There are no active random check-ins for you right now"*).

#### 3. Universal "Neutral-on-Failure" UI logic
To ensure verifications are always interactive and retryable, all condition styles—including `just_show_up` and `stay_throughout`—now share a unified status resolver:
*   **Behavior**: Any verification marked as `failed` by the backend or a local timeout is displayed as **Neutral** (the light blue pointer icon). 
*   **Rationale**: This ensures that a static "red reload" icon never blocks a user from attempting a fresh verification. Every pointer icon is interactive and triggers a live attempt/backend details via the interactive modal title.

#### 4. Hardened Waiver Sync (Saga Migration)
The **Waiver Initiation** flow (`handleStartWaiver`) was migrated away from a manual async chain to the formal `TripleWriteOrchestrator` Saga.
*   **Security**: Guarantees that the hardware alarm is only silenced/recalculated after both Convex (Cloud) and SQLite (Disk) are 100% confirmed as `waived`.
*   **Forensics**: Provides explicit `[WaiverSaga]` logs for Steps 1-3, allowing developers to see exact failure points in the hardware sync chain.

#### 6. Saga Reliability: Per-Step Timeouts
The `TripleWriteOrchestrator` has been hardened with a **15-second per-step timeout** to prevent the UI from hanging on slow network mutations (e.g., Convex cloud sync) or stalled hardware logic.
*   **Mechanism**: Each saga phase races against a configurable deadline. If a step exceeds its timeout, a descriptive error (e.g., *"Cloud Sync timed out after 15s"*) is thrown, triggering the compensating rollback chain.
*   **UX**: These errors are routed via a new `onError` prop in the Location module to the parent `ConfirmationModal`, displaying the timeout message in a high-visibility, title-only format.

#### 7. Verification Sequence (Waiver Logic)
The `verify.ts` backend sequence gate has been updated to treat `waiver_active` instances as "next actionable."
*   **Fix**: Previously, the backend only queried for `pending` tasks, which made waiver-active tasks (bypass flows) look like the user was "skipping ahead." By including `waiver_active` in the chronological gate, users can now fulfill conditions during a bypass without sequence errors.

#### 8. Business Logic: Expiry vs. Waiver Status
As of April 2026, the backend maintains a **strict chronological deadline** for all verifications:
*   **Hard Cap**: Any verification attempt made after the task's `end` time (the conclusion of the grace period) is rejected, **even if** the status is currently `waiver_active`.
*   **Intent**: This ensures that while waivers provide a bypass *mechanism*, they do not grant an indefinite "infinite grace period" beyond the hard-coded session deadline.

---

### Case Study: Passive Enforcement & Digital-Only Commitments (April 2026)

To improve flexibility for "Focus Mode" users, the commitment engine was updated to support sessions that *only* require Time + App Blocking (no Location, Photo, or Partner verification).

#### 1. The "Binding Action" Protocol
The legacy "Time + X" hardcoded validation was refactored into a categorized registry. 
*   **Active Verifications** (`location`, `partner`, `picture`, `video`): Require explicit user evidence submission.
*   **Passive Enforcements** (`digital_commitment`): Defined as "System-Level Enforcements" that anchor the commitment without user interaction.
*   **Rule**: A commitment is valid if it contains at least one **Binding Action** (Active OR Passive).

#### 2. The "Lightweight Protocol" (Backend)
For instances where `isDigitalOnly` is true (App Block present, but no Location required), the backend logic was optimized:
*   **Skip Checkpoints**: Random 5-minute pings and notifications are suppressed to save battery and reduce friction.
*   **Auto-Verified Status**: Since enforcement is handled passively by the Android OS (Accessibility Service), the `digital_commitment` condition is marked as `verified` at creation. 
*   **Failure Logic**: These instances only transition to `failed` if an explicit "Bypass" or "Security Violation" signal is received from the device's native enforcers.

---

### Case Study: Unified Identity & Duplication Resolution (April 2026)

In April 2026, the synchronization pipeline underwent a high-stakes architectural refactor to resolve "Split-Brain" database duplication (where identical tasks/instances would appear multiple times in the UI and trigger duplicate hardware alarms).

#### 1. Unified Identity Strategy
We eliminated all local random ID generation (`local_...`, `inst_...`) for both tasks and instances.
*   **Primary Key Alignment**: Both the **Saga Persistence Layer** and the **Sync Engine** now use the official Convex backend `_id` as the primary key (`id`) in all SQLite tables.
*   **Atomic Upsert**: Migrated all insertion paths to `INSERT OR REPLACE`. This ensures that even if a write race occurs between a user action (Saga) and a background refresh (Hydration), SQLite performs an atomic merge rather than creating a duplicate row.

#### 2. Manual Edit Shield
To preserve user-generated verification data during schedule re-projections, we implemented a "Shield" pattern.
*   **Mechanism**: All `DELETE` queries in the update and deletion sagas now include a `WHERE is_manual_edit = 0` filter.
*   **Behavior**: When a task's schedule is recalculated (e.g., after an update or strict-mode activation), the system purges auto-generated instances but **deliberately preserves** any rows with manual modifications (verification overrides, custom times).

#### 3. Structural Eradication
The `deleteTask` saga was hardened to target the unified Convex ID across all auxiliary tables (`task_instances`, `blocked_apps`, `blocked_websites`). By targeting the unified ID, the system can now perform a "Clean Sweep" of all associated records in a single transaction, preventing orphaned "Ghost" instances from firing alarms after a container task is gone.

#### 4. Leak Remediation
Resolved a critical ID leak in `local-db-instances.ts` where manual updates were still generating legacy `inst_` random IDs. All instance update paths now correctly respect the Unified Identity protocol.
