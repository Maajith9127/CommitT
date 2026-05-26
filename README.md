<h1 align="center">CommitT</h1>
<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL%20v3-blue" alt="License" />
</p>

<p align="center">
A strict, native Android accountability enforcer with real penalties
</p>

<p align="center">
<a href="https://committ.mintlify.app">Documentation</a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=bRXWSDxBWDg" target="_blank">
    <img src="https://img.youtube.com/vi/bRXWSDxBWDg/maxresdefault.jpg" alt="CommitT Demo Video" width="600" />
  </a>
</p>

## App Walkthrough & Features

The following step-by-step walkthrough demonstrates the user flow of setting up a new **Gym Commitment**, managing scheduling/overrides, verifying conditions, and viewing logs.

### Phase 1: Creating a Commitment (The Wizard Flow)
We begin by configuring a new accountability task: setting up scheduling, locations, app blocklists, and penalty stakes.

<table>
  <tr>
    <td align="center" valign="top" width="25%">
      <b>1. Main Dashboard</b><br/>
      <img src="screenshots/1.png" alt="Main Dashboard" width="180" /><br/>
      <sub>Ready to create a new commitment. Tap the <b>+ Add</b> button.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>2. Wizard Configuration</b><br/>
      <img src="screenshots/2.png" alt="Wizard Configuration Setup" width="180" /><br/>
      <sub>Enter name (e.g. Gym) and basic parameters for the new commitment.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>3. Time Slots & Days</b><br/>
      <img src="screenshots/3.png" alt="Time Slots Setup" width="180" /><br/>
      <sub>Add the active days and specific time windows.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>4. Slot Geofencing</b><br/>
      <img src="screenshots/4.png" alt="Slot Location Configuration" width="180" /><br/>
      <sub>Configure location bounds per time slot (selecting <b>Stay Throughout</b> or <b>Just Show Up</b> logic).</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="25%">
      <b>5. Slot App Blocking</b><br/>
      <img src="screenshots/5.png" alt="Slot App Blocklist" width="180" /><br/>
      <sub>Select which apps to block during this specific time slot.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>6. Slot Behavioral Rules</b><br/>
      <img src="screenshots/6.png" alt="Slot Rules" width="180" /><br/>
      <sub>Configure granular behavioral rules, intensity levels, and alarm timings for the slot.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>7. Universal Location</b><br/>
      <img src="screenshots/7.png" alt="Universal Location Fallback" width="180" /><br/>
      <sub>Set an overall location fallback that applies universally to all slots unless overridden.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>8. Universal App Blocking</b><br/>
      <img src="screenshots/8.png" alt="Universal App Blocklist" width="180" /><br/>
      <sub>Set an overall app blocklist that applies universally to all time slots.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="25%">
      <b>9. Penalties & Waivers</b><br/>
      <img src="screenshots/9.png" alt="Stakes and Penalty Configuration" width="180" /><br/>
      <sub>Configure financial stakes, social penalty images, or waiver redemption options.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>10. Universal Rules</b><br/>
      <img src="screenshots/10.png" alt="Universal Behavioral Rules" width="180" /><br/>
      <sub>Define overall behavioral rules (per-slot settings will automatically override these).</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>11. Dashboard Updated</b><br/>
      <img src="screenshots/11.png" alt="Dashboard with new Commitment" width="180" /><br/>
      <sub>Back to the main dashboard displaying the newly added, active <b>Gym</b> commitment.</sub>
    </td>
    <td width="25%"></td>
  </tr>
</table>

### Phase 2: Calendar, Live Verification & History
Once commitments are active, CommitT schedules task instances, runs background monitors, and logs enforcement.

<table>
  <tr>
    <td align="center" valign="top" width="25%">
      <b>12. Task Calendar</b><br/>
      <img src="screenshots/12.png" alt="Scheduled Calendar Instances" width="180" /><br/>
      <sub>View generated task instances (e.g. Gym session scheduled for 10:30 PM - 11:55 PM).</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>13. Instance Modal</b><br/>
      <img src="screenshots/13.png" alt="Instance Action Modal" width="180" /><br/>
      <sub>Clicking a calendar instance opens the action modal showing details and conditions.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>14. Live Verification</b><br/>
      <img src="screenshots/14.png" alt="Location Verification Success" width="180" /><br/>
      <sub>When at the right time and place, clicking the hand icon verifies the location condition.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>15. Presets Builder</b><br/>
      <img src="screenshots/15.png" alt="Presets Management" width="180" /><br/>
      <sub>Configure reusable presets (locations, app blocks, rules) to load into slots.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" width="25%">
      <b>16. Upcoming & History</b><br/>
      <img src="screenshots/16.png" alt="Enforcement History Logs" width="180" /><br/>
      <sub>Review upcoming alarms, history records, and compliance audit logs.</sub>
    </td>
    <td align="center" valign="top" width="25%">
      <b>17. Profile & Settings</b><br/>
      <img src="screenshots/17.png" alt="User Profile Details" width="180" /><br/>
      <sub>Manage active profile settings, account credentials, and enforcer flags.</sub>
    </td>
    <td width="25%"></td>
    <td width="25%"></td>
  </tr>
</table>



## Why CommitT?

Most accountability apps rely on willpower. CommitT doesn't. It hooks directly into the Android operating system — blocking apps, locking settings, and enforcing real penalties when you break your commitments. No loopholes.

- **Automatic app blocking** — Instagram, YouTube, Games, etc. get hard-blocked during active sessions
- **Settings lockout** — you cannot access device Settings or disable blocks mid-session
- **Time + Location enforcement** — commitments activate based on when and where you are
- **Random check-ins** — photo and GPS verification at unpredictable intervals to prove you stayed
- **Multiple difficulty levels** — choose how strict the enforcement should be
- **Real penalties** — money stakes, embarrassing photos sent to friends, or CAPTCHA walls
- **Immutable commitments** — once a session starts, you cannot edit or delete it
- **Penalty waivers** — fail a commitment? Complete redemption challenges before the deadline or the penalty fires automatically
- **Smart alarms** — staggered pre-alarms, session start, random checkpoint pings, and end-of-window notifications

## How It Works

CommitT uses a **Triple-Write Protocol** to synchronize commitments across three isolated environments:

1. **Cloud First (Convex Backend)** — The remote mutation is attempted first. If it fails (e.g., no network), the entire operation halts with a clean error. The cloud is the source of truth.
2. **Local Cache (Expo SQLite)** — On cloud success, a raw SQL transaction writes the task and all generated instances to the on-device database. This powers instant UI re-renders without a network round-trip.
3. **Native OS (Kotlin AlarmScheduler)** — Finally, `scheduleNextAlarm()` fires across the React Native JSI bridge. The Kotlin module reads SQLite state and binds WakeLock-backed PendingIntents to the hardware alarm clock.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Device / UI
    participant JS as React Native JS (Expo)
    participant Cloud as Convex Backend (Cloud First)
    participant SQL as Local SQLite (Local Cache)
    participant Kotlin as Kotlin Native OS (JSI Bridge)

    User->>JS: Press CommitT (Wizard Final Screen)
    JS->>JS: Prepare and upload media assets (e.g. Penalty photo)
    
    Note over JS, Cloud: Step 1: Cloud-First Mutation Gate
    JS->>Cloud: POST mutation (create/update task)
    alt Cloud Write Fails
        Cloud-->>JS: Error (Unauthenticated / Validation failure)
        JS->>User: Abort transaction and show Error Modal
    else Cloud Write Succeeds
        Cloud-->>JS: Success (taskId, instances)
        Note over Cloud: Task is permanently committed on Cloud
    end

    Note over JS, Kotlin: Step 2: Main Local Sync (syncLock)
    JS->>SQL: SQL Transaction (Insert/Update Task & Instances)
    JS->>Kotlin: JSI Bridge Call: scheduleNextAlarm()
    
    alt Local Sync Succeeds
        Kotlin-->>JS: Alarms Synchronized
        JS->>User: Clear loaders and navigate back to Dashboard
    else Local Sync Fails (e.g. SQLite Lock / System lag)
        Note over JS: Trigger Forward-Heal Loop
        JS->>User: Render full-screen blocking Healing Overlay
        
        loop Every 2 Seconds (Until Eventual Consistency)
            Note over JS, SQL: Ingest latest cloud state
            JS->>SQL: Targeted purge (DELETE stale instances)
            JS->>Cloud: Query latest Delta payload (getDeltaPayload)
            Cloud-->>JS: Delta payload
            JS->>SQL: Ingest Delta payload (ingestDeltaPayload)
            JS->>Kotlin: JSI Bridge Call: scheduleNextAlarm()
            Note over JS, User: If successful: Dismiss overlay & Return SUCCESS (Dashboard)
            Note over JS: If fails: Wait 2s and retry infinitely
        end
    end
```

Each layer is gated behind the previous. If the Cloud Write fails, the operation terminates cleanly. However, once the Cloud confirmation is received, the operation is considered globally successful. If a subsequent local write fails, instead of reverting the cloud (Saga rollback), CommitT executes an infinite **Forward-Heal Loop** to pull the latest Convex Delta payload and ingest it into SQLite, ensuring eventual local consistency without split-brain anomalies.

## Vision

**Enforcement over motivation.** Willpower fades after two weeks. CommitT physically prevents quitting.

**Cloud-first, locally resilient.** The source of truth lives in Convex. But once synced, enforcement runs entirely on-device via SQLite and native Kotlin services — surviving network drops, app restarts, and phone reboots.

**Security through depth.** Three layers of Android system integration (Accessibility Service, WindowManager overlays, AlarmManager + WakeLocks) make circumvention extremely difficult. The anti-bypass heuristics remain closed-source by design.

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Core** | React Native, Expo, TypeScript, Reanimated, Zustand |
| **Native Android** | Kotlin, Accessibility Service, WindowManager, AlarmManager, WakeLocks |
| **Location Tracking**| Android LocationManager (1Hz Live GPS), FusedLocationProviderClient, Google Maps/Places APIs |
| **Backend** | Convex (real-time sync + serverless mutations), domain-driven crons |
| **Local DB** | SQLite via Expo SQLite (WAL journaling, mutex-locked writes, Nuke & Pave migrations) |
| **Auth & Security** | Better Auth (Email/OAuth), JailMonkey (Root/Jailbreak Detection) |
| **Styling & UI** | TailwindCSS v4, Uniwind, HeroUI Native, Gorhom Bottom Sheets |
| **Validation & Data**| Zod (Runtime Schemas), OpenCode AI SDK |
| **Monorepo** | Turborepo, Bun |
| **Desktop / Browser**| Tauri + Vite + React, WXT (Browser Extension Framework) |

## Architecture

```
apps/
├── native/                    # React Native + Expo mobile client
│   ├── app/                   # Screens and routing
│   │   ├── (main)/            # Dashboard, commits list, presets
│   │   ├── (create-commit)/   # Multi-step commitment creation wizard
│   │   ├── (auth)/            # Authentication and session management
│   │   ├── (penalties)/       # Penalty configuration screens
│   │   └── (settings)/        # Permissions audit, preferences
│   ├── lib/                   # Core infrastructure
│   │   ├── triple-write-orchestrator.ts   # Cloud → SQLite → Kotlin saga
│   │   ├── sync-engine.ts     # Offline sync and write-gate queue
│   │   ├── local-db.ts        # Nuke & Pave schema management
│   │   ├── sync-lock.ts       # Cross-thread mutex locks
│   │   ├── local-db-commits.ts# Specialized SQLite transaction boundaries
│   │   └── validation/        # Task constraint validation (timeSlot.ts, taskDraft.ts)
│   ├── modules/               # Native Kotlin bridges (JSI)
│   │   ├── scheduler-module/  # AlarmManager + WakeLock orchestration
│   │   │   ├── AlarmScheduler.kt # Binds SQLite state to Android Alarm Clock
│   │   │   ├── BootReceiver.kt   # Re-hydrates state on device restart (FBE bypass)
│   │   │   └── SchedulerModule.kt# JSI bindings for JS layer
│   │   ├── blocker-module/    # [CLOSED SOURCE] Anti-circumvention engine
│   │   ├── app-lister-module/ # JSI-powered package enumeration
│   │   │   └── AppListerModule.kt # High-speed extraction of installed packages
│   │   ├── recovery-module/   # Self-healing connection recovery
│   │   │   └── RecoveryModule.kt # Monitors and resurrects dead websockets
│   │   └── logcat-module/     # Native logging bridge
│   │       └── LogcatRecorder.kt # In-memory buffer for bridging native logs to JS
│   ├── components/            # UI components and design tokens
│   ├── providers/             # Resurrection provider, hydration engine
│   ├── stores/                # Zustand state machines
│   └── plugins/               # Expo config plugins (AndroidManifest AST patches)
├── web/                       # Tauri desktop dashboard
├── extension/                 # Browser distraction blocker (WXT)
└── BugReport/                 # Forensic engineering case studies

packages/
├── backend/convex/            # Convex cloud backend (Domain-Driven Design)
│   ├── api/                   # Presentation Layer: Public mutation/query handlers
│   │   ├── commitments/       # Client interfaces for commitment creation
│   │   ├── instances/         # Session instance controllers
│   │   ├── notifications/     # Outbound webhook & push routing
│   │   ├── security/          # Auth and permission boundaries
│   │   └── sync/              # Client-to-cloud synchronization endpoints
│   ├── config/                # Environment, constants, and enums
│   ├── core/                  # Domain Layer: Pure Business Logic
│   │   ├── commitments/       # Commitment lifecycle rules
│   │   ├── enforcement/       # Restriction and hardware lock logic
│   │   ├── instances/         # State machine for active sessions
│   │   ├── penalties/         # Accountability calculation rules
│   │   ├── verification/      # Cryptographic & GPS validation rules
│   │   └── waivers/           # Redemption and waiver rules
│   ├── db/                    # Data Access Layer
│   │   └── schema.ts          # 500+ line typed schema with immutable lock zones
│   ├── execution/             # Application Layer: Background jobs & scheduling
│   │   ├── penalties/         # Async workers for Stripe/Resend execution
│   │   ├── scheduling/        # State transitions and cron orchestrators
│   │   ├── verification/      # Async condition validation workers
│   │   └── watchdog.ts        # Background cron that identifies orphaned tasks
│   ├── lib/                   # Shared utilities (logger, errorHandling, validators)
│   └── crons.ts               # Hourly self-healing scheduler registration
└── docs/                      # Architecture and philosophy documentation
```

## Engineering Highlights

- **SQLite WAL Contention Resolution** — Diagnosed and fixed a production database corruption caused by competing WAL writer locks between the Kotlin native layer and Expo SQLite JS runtime. Full forensic writeup in `apps/BugReport/SyncBug.txt`.
- **82% Android Memory Reduction** — Resolved a `java.lang.OutOfMemoryError` (124MB allocation) in the scheduler module by implementing data-size constraints and connection lifecycle management.
- **Boot-Resilient Alarm Architecture** — Dual-storage system ("Vault" + "Sticky Note") ensures alarms survive phone reboots even before the user enters their PIN, using Android's Device Protected Storage (FBE bypass).
- **Self-Healing Watchdog** — Backend cron that automatically detects and reschedules orphaned task instances every hour.

## Documentation

- **Official Documentation**: [committ.mintlify.app](https://committ.mintlify.app) — Production-level user guides, feature documentation, and configuration references.
- **Engineering Logs & Architecture Notes**: [Daily Logging Journey](https://committ.mintlify.app/2025/december/day-05) — A deep-dive personal development diary detailing how the architecture was built, the technical challenges faced, and the solutions implemented.

## Security Notice

To prevent bypass abuse, the core Kotlin anti-circumvention heuristics and penalty execution engines remain closed-source. This repository contains the public-facing architecture, native bridges, and synchronization layer.

## Acknowledgements

<table>
  <tr>
    <td align="center"><a href="https://reactnative.dev/"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" width="60" alt="React Native" /></a></td>
    <td align="center"><a href="https://convex.dev"><img src="https://pbs.twimg.com/profile_images/1886599096636694528/0Y8VYt94_400x400.png" width="60" alt="Convex" style="border-radius:10px" /></a></td>
    <td align="center"><a href="https://expo.dev"><img src="https://avatars.githubusercontent.com/u/12504344?s=200&v=4" width="60" alt="Expo" style="border-radius:10px" /></a></td>
    <td align="center"><a href="https://docs.swmansion.com/react-native-reanimated/"><img src="https://avatars.githubusercontent.com/u/6952717?s=200&v=4" width="60" alt="Software Mansion" style="border-radius:10px" /></a></td>
    <td align="center"><a href="https://wxt.dev"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCE8JgRAqw2TaqOlrnpD0w6HcuVKkWwxWTJQ&s" width="60" alt="WXT" style="border-radius:10px" /></a></td>
    <td align="center"><a href="https://better-auth.com/"><img src="https://repository-images.githubusercontent.com/803014189/1fffa32b-9794-4ec0-93e9-3e07401a3f03" height="60" alt="Better Auth" style="border-radius:10px" /></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://reactnative.dev/"><b>React Native</b></a><br>Core Mobile Layer</td>
    <td align="center"><a href="https://convex.dev"><b>Convex</b></a><br>Serverless Backend</td>
    <td align="center"><a href="https://expo.dev"><b>Expo</b></a><br>Native Framework</td>
    <td align="center"><a href="https://docs.swmansion.com/react-native-reanimated/"><b>Reanimated</b></a><br>60fps Animations</td>
    <td align="center"><a href="https://wxt.dev"><b>WXT</b></a><br>Extension Engine</td>
    <td align="center"><a href="https://better-auth.com/"><b>Better Auth</b></a><br>Authentication</td>
  </tr>
</table>

## License

CommitT is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

This ensures that any modified versions deployed as a service must also remain open-source under the same license.

Commercial licensing may be available in the future for organizations seeking proprietary usage rights.
