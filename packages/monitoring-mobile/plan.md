# Monitoring Mobile Foreground Service Implementation Plan

**Note: This plan is Android-only.** Foreground services, usage statistics access, and the monitoring functionality described are Android-specific features. iOS implementation would require completely different approaches.

## ⚡ Core Purpose of a Foreground Service

A **foreground service** is a special Android service that:

* 🧭 Keeps running **even when the app is not in the foreground**
* ⏳ Is **much less likely** to be killed by the system
* 📣 Shows a **persistent notification** to inform the user it's running
* 📡 Can continuously collect or process data in real time

👉 This is why most monitoring, tracking, health, fitness, or VPN apps rely on it.

---

## 🧠 What the Foreground Service Should Do

1. **Start immediately on boot or app launch**
2. **Run continuously** to keep monitoring logic alive
3. **Host the core “listeners” or “managers”** (e.g., usage stats, broadcast receivers, idle trackers)
4. **Reschedule itself or restart gracefully** if killed
5. **Show a persistent notification** with a clear purpose

---

## ⚙️ Minimal Structure (Concept)

```kotlin
class MonitoringService : Service() {

    override fun onCreate() {
        super.onCreate()
        // Initialize monitoring components here (usage listeners, receivers, etc.)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 1. Create notification channel if not created
        val notification = buildPersistentNotification()

        // 2. Start as a foreground service
        startForeground(1, notification)

        // 3. Start background monitoring work here
        startMonitoringLogic()

        // 4. Ensure sticky so system tries to restart
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up and reschedule if needed
        restartServiceIfNeeded()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```

---

## 🔔 Persistent Notification (Required)

```kotlin
private fun buildPersistentNotification(): Notification {
    val channelId = "monitoring_service_channel"
    val channelName = "Monitoring Service"

    // Create notification channel (once)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_LOW
        )
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    return NotificationCompat.Builder(this, channelId)
        .setContentTitle("Monitoring Active")
        .setContentText("Tracking usage and events in background")
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setOngoing(true)
        .build()
}
```

📝 **Note:** The notification must be ongoing and cannot be swiped away easily.

---

## 🔁 Boot + Survival

* **Restart on reboot:**
  Register a `BOOT_COMPLETED` receiver to relaunch the service.
* **Restart if killed:**
  `START_STICKY` in `onStartCommand()` ensures the system tries to bring it back.
* **Handle Doze Mode:**
  Use `WorkManager` or `AlarmManager` + `WakeLock` strategically if needed.

---

## 🧩 Typical Tasks Handled by the Foreground Service

| Task                 | Example Implementation                      |
| -------------------- | ------------------------------------------- |
| App usage tracking   | Poll `UsageStatsManager` every X seconds    |
| Screen on/off events | Register `BroadcastReceiver` inside service |
| Idle time tracking   | Compare timestamps in service loop          |
| Network changes      | Monitor connectivity changes                |
| Scheduling           | Use `Handler` or coroutines loop            |

---

## 🛡️ Best Practices

* Keep heavy work **off the main thread** (use coroutines or a separate thread).
* Keep notification **clear and minimal** to avoid user annoyance.
* Don’t abuse battery — do smart interval polling or event-driven tracking.
* Gracefully stop or pause when monitoring is not needed.

---

✅ **In short:**
The **foreground service is the anchor** — it **keeps your monitoring system alive**, listens for events, runs scheduled checks, and ensures the system doesn’t silently kill your background logic.


## Phase 1: Core Android Infrastructure (High Priority)

### 1.1 Android Manifest Configuration
- [x] Update `android/src/main/AndroidManifest.xml` with foreground service permissions:
  - [x] Add `android.permission.FOREGROUND_SERVICE`
  - [x] Add `android.permission.FOREGROUND_SERVICE_SPECIAL_USE`
  - [x] Add `android.permission.PACKAGE_USAGE_STATS` (signature level)
  - [x] Add `android.permission.RECEIVE_BOOT_COMPLETED`
  - [x] Add `android.permission.WAKE_LOCK`

- [x] Declare MonitoringForegroundService in manifest:
  - [x] Set `android:foregroundServiceType="specialUse"`
  - [x] Add `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` property with value "usage_analytics_monitoring"
  - [x] Set `android:exported="false"`

- [x] Register BootReceiver:
  - [x] Add receiver declaration for `.BootReceiver`
  - [x] Register for `android.intent.action.BOOT_COMPLETED` and `android.intent.action.LOCKED_BOOT_COMPLETED`
  - [x] Set `android:exported="false"`

- [x] Register ScreenStateReceiver:
  - [x] Add receiver declaration for `.ScreenStateReceiver`
  - [x] Register for screen on/off and user present intents
  - [x] Set `android:exported="false"`

### 1.2 Foreground Service Implementation
- [x] Create `MonitoringForegroundService.kt` class extending Service
- [x] Implement required lifecycle methods:
  - [x] `onCreate()` - Initialize managers and receivers
  - [x] `onStartCommand()` - Start foreground with notification
  - [x] `onDestroy()` - Cleanup and schedule restart
  - [x] `onBind()` - Return null (not bound service)

- [x] Add service initialization logic:
  - [x] Initialize NotificationManager, UsageStatsManager
  - [x] Register screen state receiver
  - [x] Start monitoring background tasks

- [x] Implement foreground promotion:
  - [x] Create notification channel (Android 8+)
  - [x] Build persistent notification
  - [x] Call `ServiceCompat.startForeground()` with proper error handling
  - [x] Handle `ForegroundServiceStartNotAllowedException`

- [x] Add restart logic:
  - [x] Return `START_STICKY` from `onStartCommand`
  - [x] Implement `scheduleRestartIfNeeded()` in `onDestroy()`

### 1.3 Persistent Notification System
- [x] Create notification channel:
  - [x] Channel ID: "monitoring_service_channel"
  - [x] Channel name: "Monitoring Service"
  - [x] Importance: `NotificationManager.IMPORTANCE_LOW`
  - [x] Create channel if Android 8+

- [x] Build persistent notification:
  - [x] Set ongoing status (cannot be swiped away)
  - [x] Add clear title: "Monitoring Active"
  - [x] Add description: "Tracking usage and events in background"
  - [x] Use appropriate icon (ic_lock_idle_alarm)
  - [x] Set priority to `PRIORITY_LOW`

## Phase 2: Monitoring Functionality (Medium Priority)

### 2.1 Usage Statistics Tracking
- [x] Implement UsageStatsManager integration:
  - [x] Check usage stats permission at runtime
  - [x] Query usage events for app launches/exits
  - [x] Track foreground time per application
  - [x] Monitor last used timestamps
  - [x] Handle permission denial gracefully

- [x] Create usage data collection:
  - [x] Periodic polling (every 30 seconds)
  - [x] Calculate app usage durations
  - [x] Store usage sessions with timestamps
  - [x] Handle permission revocation

### 2.2 Screen State Monitoring
- [x] Create `ScreenStateReceiver.kt` extending BroadcastReceiver
- [x] Register for screen events:
  - [x] `Intent.ACTION_SCREEN_ON`
  - [x] `Intent.ACTION_SCREEN_OFF`
  - [x] `Intent.ACTION_USER_PRESENT`

- [x] Implement event tracking:
  - [x] Log screen on/off timestamps
  - [x] Track user unlock events
  - [x] Calculate idle time between interactions
  - [x] Store screen state changes

### 2.3 Idle Time Tracking
- [x] Implement session management:
  - [x] Track user activity periods
  - [x] Calculate idle time between screen events
  - [x] Monitor app usage patterns
  - [x] Store session data (start/end times)

- [x] Add daily summaries:
  - [x] Aggregate total idle time per day
  - [x] Calculate average session lengths
  - [x] Track peak usage hours

### 2.4 Network Monitoring (Optional)
- [x] Add connectivity monitoring:
  - [x] Register for `ConnectivityManager.CONNECTIVITY_ACTION`
  - [x] Track WiFi/mobile data changes
  - [x] Log network availability events
  - [x] Store connectivity data with timestamps

## Phase 3: Data Management & Persistence

### 3.1 Local Data Storage
- [x] Choose storage solution:
  - [x] Room database for structured data
  - [ ] OR SharedPreferences for simple data
  - [ ] OR File-based storage for flexibility

- [x] Define data entities:
  - [x] AppUsageSession: app_package, start_time, end_time, duration
  - [x] ScreenEvent: timestamp, event_type (on/off/present)
  - [x] DailySummary: date, total_usage_time, idle_time, session_count

- [x] Implement data access layer:
  - [x] Create DAO interfaces for database operations
  - [x] Add data insertion/update methods
  - [x] Implement data retrieval queries
  - [x] Handle database migrations

### 3.2 Data Synchronization
- [x] Implement WorkManager for background sync:
  - [x] Create `DataSyncWorker` class
  - [x] Schedule periodic sync (daily/hourly)
  - [x] Handle network availability checks
  - [x] Implement retry logic for failures

- [x] Add data export functionality:
  - [x] JSON serialization of collected data
  - [x] Compress data for efficient transfer
  - [x] Implement secure upload mechanism

## Phase 4: Expo Module Integration

### 4.1 Module API Updates
- [x] Update `MonitoringMobileModule.ts` with new functions:
  - [x] `startMonitoring(): Promise<boolean>`
  - [x] `stopMonitoring(): Promise<boolean>`
  - [x] `getUsageData(startDate: string, endDate: string): Promise<UsageData[]>`
  - [x] `isMonitoringActive(): Promise<boolean>`
  - [x] `requestUsagePermission(): Promise<boolean>`

- [x] Update TypeScript types:
  - [x] Define `UsageData` interface
  - [x] Add monitoring status types
  - [x] Define permission request results

### 4.2 Permission Handling
- [x] Implement Android permission checks:
  - [x] Check usage stats permission status
  - [x] Guide user to Settings if needed
  - [x] Handle permission grant/deny results

## Phase 5: Boot Persistence & Error Handling

### 5.1 Boot Receiver Implementation
- [ ] Create `BootReceiver.kt` extending BroadcastReceiver
- [ ] Implement `onReceive()` method:
  - [ ] Check if monitoring should be active
  - [ ] Start MonitoringForegroundService
  - [ ] Handle exceptions gracefully

- [ ] Add service restart logic:
  - [ ] Check user preferences for auto-start
  - [ ] Verify all required permissions
  - [ ] Start service with proper error handling

### 5.2 Error Handling Strategy
- [ ] Handle `ForegroundServiceStartNotAllowedException`:
  - [ ] Log appropriate error messages
  - [ ] Schedule retry with backoff
  - [ ] Notify user if needed

- [ ] Handle `SecurityException` for permissions:
  - [ ] Check permission status
  - [ ] Request missing permissions
  - [ ] Gracefully disable features

- [ ] Handle Android 15+ timeout restrictions:
  - [ ] Implement `onTimeout()` callback
  - [ ] Stop service within timeout period
  - [ ] Schedule alternative background work

### 5.3 Service Lifecycle Management
- [ ] Implement robust service operation:
  - [ ] Handle service being killed by system
  - [ ] Implement restart mechanisms using AlarmManager
  - [ ] Handle user-initiated stops gracefully

- [ ] Add battery optimization handling:
  - [ ] Check battery optimization status
  - [ ] Request whitelist if needed
  - [ ] Adjust monitoring frequency based on battery

## Phase 6: Testing & Validation

### 6.1 Unit Tests
- [ ] Test service lifecycle:
  - [ ] Service creation and destruction
  - [ ] Foreground promotion success/failure
  - [ ] Notification creation

- [ ] Test monitoring functionality:
  - [ ] Usage stats data collection
  - [ ] Screen event tracking accuracy
  - [ ] Data persistence operations

### 6.2 Integration Tests
- [ ] Test end-to-end scenarios:
  - [ ] Service start/stop through Expo module
  - [ ] Boot restart functionality
  - [ ] Data collection and retrieval

- [ ] Test permission flows:
  - [ ] Usage stats permission request
  - [ ] Foreground service permission handling
  - [ ] Boot receiver permission checks

### 6.3 Manual Testing Checklist
- [ ] Device reboot scenarios:
  - [ ] Service restarts after reboot
  - [ ] Data collection resumes correctly
  - [ ] Permissions maintained

- [ ] Battery optimization impact:
  - [ ] Service behavior with battery optimization
  - [ ] Wake lock management
  - [ ] Background execution limits

- [ ] Memory pressure situations:
  - [ ] Service survives low memory conditions
  - [ ] Data integrity maintained
  - [ ] Graceful degradation

- [ ] User interaction scenarios:
  - [ ] User stops service from notification
  - [ ] Permission denial handling
  - [ ] Settings changes impact

## Technical Considerations Checklist

### Android API Level Support
- [ ] Minimum API 26 (Android 8.0) for notification channels
- [ ] API 28+ for improved usage stats
- [ ] API 31+ for foreground service restrictions
- [ ] API 34+ for enhanced permission checks

### Battery & Performance Optimization
- [ ] Efficient polling intervals (30s minimum)
- [ ] Proper WakeLock management
- [ ] Background thread usage for heavy operations
- [ ] Memory leak prevention (handler cleanup)

### Privacy & Security
- [ ] Transparent data collection disclosure
- [ ] User consent requirements implementation
- [ ] Data minimization principles
- [ ] Secure local storage encryption

### Google Play Compliance
- [ ] Foreground service type declaration in Play Console
- [ ] Privacy policy updates for data collection
- [ ] Usage stats permission justification
- [ ] Battery optimization handling documentation

## Implementation Order
- [x] Phase 1: Core Android Infrastructure
- [x] Phase 2: Monitoring Functionality
- [x] Phase 3: Data Management & Persistence
- [x] Phase 4: Expo Module Integration
- [ ] Phase 5: Boot Persistence & Error Handling
- [ ] Phase 6: Testing & Validation
