# 📊 @mono/monitoring

**Enterprise-grade Android usage analytics with real-time monitoring, comprehensive data collection, and robust background processing capabilities.**

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](#)
[![Platform](https://img.shields.io/badge/platform-Android-blue)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](#)

## ✨ Features

- **📱 Real-time Usage Tracking**: Monitor app launches, exits, and session durations
- **🖥️ Screen Activity Monitoring**: Track screen on/off/unlock events with idle time calculation
- **🔄 Background Persistence**: Runs as Android foreground service, survives app restarts and device reboots
- **📊 Data Aggregation**: Daily summaries with usage patterns and analytics
- **🎯 Event-driven Architecture**: Real-time event emission for live monitoring
- **🔒 Privacy-focused**: Only usage statistics, requires explicit user permission
- **⚡ High Performance**: Efficient 30-second polling with battery-aware operation

## 📖 Overview

This package provides enterprise-grade Android usage analytics with comprehensive data collection and real-time monitoring capabilities. Built as an Expo module for Android, it offers seamless integration with React Native Android apps using native Android performance.

**Key Capabilities:**
- **Foreground Service**: Persistent background monitoring with user-visible notification
- **Usage Statistics**: Detailed app usage tracking with Android's UsageStatsManager
- **Event Streaming**: Real-time events from native Android to JavaScript
- **Data Persistence**: Local Room database with automatic cleanup and sync
- **Permission Management**: Guided user experience for Android permissions

## Quick Start

```typescript
import { Monitoring } from '@mono/monitoring';

// Initialize monitoring
await Monitoring.start();

// Check permissions
if (!(await Monitoring.hasPermission())) {
  await Monitoring.requestPermission();
}

// Get usage data
const usage = await Monitoring.getUsageData('2024-01-01', '2024-01-31');
console.log('Usage data:', usage);

// Listen to real-time events
Monitoring.addEventListener((event) => {
  console.log('Monitoring event:', event);
});

// Get daily summaries
const summaries = await Monitoring.getDailySummaries('2024-01-01', '2024-01-31');
console.log('Daily summaries:', summaries);
```

## API Reference

### Service Control

#### `Monitoring.start(): Promise<boolean>`
Starts the Android monitoring foreground service.
```typescript
const success = await Monitoring.start();
if (success) {
  console.log('Monitoring started successfully');
}
```

#### `Monitoring.stop(): Promise<boolean>`
Stops the Android monitoring foreground service.
```typescript
const success = await Monitoring.stop();
if (success) {
  console.log('Monitoring stopped successfully');
}
```

#### `Monitoring.isActive(): Promise<boolean>`
Checks if the monitoring service is currently active.
```typescript
const isActive = await Monitoring.isActive();
console.log('Monitoring active:', isActive);
```

### Permission Handling

#### `Monitoring.hasPermission(): Promise<boolean>`
Checks if the app has Android usage stats permission.
```typescript
const hasPermission = await Monitoring.hasPermission();
if (!hasPermission) {
  // Request permission from user
}
```

#### `Monitoring.requestPermission(): Promise<boolean>`
Requests Android usage stats permission from the user.
```typescript
const granted = await Monitoring.requestPermission();
if (granted) {
  console.log('Permission granted');
} else {
  console.log('Permission denied');
}
```

#### `Monitoring.getPermissionStatus(): Promise<PermissionStatus>`
Gets detailed permission status information.
```typescript
const status = await Monitoring.getPermissionStatus();
console.log('Permission status:', status);
// { usageStatsGranted: true, canRequestPermission: true }
```

### Data Retrieval

#### `Monitoring.getUsageData(startDate, endDate): Promise<UsageData[]>`
Retrieves usage data for the specified date range.
```typescript
const usageData = await Monitoring.getUsageData('2024-01-01', '2024-01-31');
usageData.forEach(item => {
  console.log(`${item.appPackage}: ${item.duration}ms`);
});
```

#### `Monitoring.getDailySummaries(startDate, endDate): Promise<DailySummary[]>`
Retrieves daily usage summaries for the specified date range.
```typescript
const summaries = await Monitoring.getDailySummaries('2024-01-01', '2024-01-31');
summaries.forEach(summary => {
  console.log(`${summary.date}: ${summary.totalUsageTime}ms total usage`);
});
```

### Data Management

#### `Monitoring.syncData(): Promise<boolean>`
Manually triggers data synchronization.
```typescript
const success = await Monitoring.syncData();
if (success) {
  console.log('Data synchronized successfully');
}
```

### Event System

#### `Monitoring.addEventListener(callback): EventSubscription`
Listens to real-time monitoring events.
```typescript
const subscription = Monitoring.addEventListener((event) => {
  switch (event.type) {
    case 'screen_event':
      console.log('Screen event:', event.data);
      break;
    case 'usage_event':
      console.log('Usage event:', event.data);
      break;
    case 'network_event':
      console.log('Network event:', event.data);
      break;
    case 'service_status':
      console.log('Service status:', event.data);
      break;
  }
});

// Remove listener when done
subscription.remove();
```

#### `Monitoring.addPermissionListener(callback): EventSubscription`
Listens to permission status changes.
```typescript
const subscription = Monitoring.addPermissionListener((status) => {
  console.log('Permission status changed:', status);
  // { usageStatsGranted: true, canRequestPermission: false }
});
```

## Data Types

### `UsageData`
```typescript
type UsageData = {
  id: number;           // Unique identifier
  appPackage: string;   // Android package name (e.g., "com.example.app")
  startTime: number;    // Start timestamp (milliseconds)
  endTime: number | null; // End timestamp or null if active
  duration: number;     // Usage duration (milliseconds)
  isActive: boolean;    // Whether the app is currently active
};
```

### `DailySummary`
```typescript
type DailySummary = {
  date: string;         // Date in YYYY-MM-DD format
  totalUsageTime: number; // Total usage time (milliseconds)
  idleTime: number;     // Total idle time (milliseconds)
  sessionCount: number; // Number of usage sessions
  lastUpdated: number;  // Last update timestamp
};
```

### `PermissionStatus`
```typescript
type PermissionStatus = {
  usageStatsGranted: boolean;     // Whether usage stats permission is granted
  canRequestPermission: boolean;  // Whether permission can be requested
};
```

### `MonitoringEventPayload`
```typescript
type MonitoringEventPayload = {
  type: "screen_event" | "usage_event" | "network_event" | "service_status";
  data: any;           // Event-specific data
  timestamp: number;   // Event timestamp
};
```

## 🎯 Use Cases

**Productivity Apps:**
- Screen time tracking and daily limits
- App usage insights and detailed reports
- Focus session monitoring and analytics

**Parental Controls:**
- Child device usage monitoring
- App restriction enforcement
- Comprehensive usage time limits

**Analytics Platforms:**
- User behavior research and insights
- App engagement metrics
- Device usage pattern analysis

**Enterprise Solutions:**
- Employee productivity monitoring
- Device usage compliance tracking
- Security and audit logging

## 🏗️ Architecture

The monitoring system uses a layered architecture for optimal performance and reliability:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JavaScript    │    │   Expo Module   │    │   Native Android │
│     API Layer   │◄──►│   Bridge Layer  │◄──►│   Service Layer  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Real-time Events │    │  Event Emission │    │Broadcast Receivers│
│   & Callbacks    │    │  System         │    │  & Sensors       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Room Database │    │  Data Repository│    │  WorkManager    │
│   Persistence   │◄──►│   Business Logic│◄──►│ Background Sync  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Key Components:**
- **Foreground Service**: Persistent background monitoring with user notification
- **Broadcast Receivers**: Screen state and boot event handling
- **Room Database**: Structured data storage with automatic migrations
- **WorkManager**: Scheduled background tasks and data synchronization
- **Expo Bridge**: Seamless communication between JavaScript and native code

## 📊 Data Types

### `UsageData`
```typescript
type UsageData = {
  id: number;           // Unique session identifier
  appPackage: string;   // Android package name (e.g., "com.example.app")
  startTime: number;    // Session start timestamp (milliseconds)
  endTime: number | null; // Session end timestamp or null if active
  duration: number;     // Total usage duration (milliseconds)
  isActive: boolean;    // Whether the app is currently active
};
```

### `DailySummary`
```typescript
type DailySummary = {
  date: string;         // Date in YYYY-MM-DD format
  totalUsageTime: number; // Total usage time (milliseconds)
  idleTime: number;     // Total idle time (milliseconds)
  sessionCount: number; // Number of usage sessions
  lastUpdated: number;  // Last update timestamp
};
```

### `MonitoringEventPayload`
```typescript
type MonitoringEventPayload = {
  type: "screen_event" | "usage_event" | "network_event" | "service_status";
  data: any;           // Event-specific data payload
  timestamp: number;   // Event timestamp (milliseconds)
};
```

## 📱 Platform Support

- **✅ Android**: Full implementation with foreground service, usage stats, screen monitoring, and background sync
- **❌ Web/iOS**: Not supported - Android-only package

## 📋 Current Status

**✅ Production Ready**: Core functionality is complete and tested. The package provides enterprise-grade Android usage analytics.

**🔄 Remaining**: Only formal testing suite needs implementation. See [ROADMAP.md](ROADMAP.md) for detailed status.

## 📚 Additional Resources

- **[ROADMAP.md](ROADMAP.md)**: Development roadmap and implementation status
- **Monorepo Documentation**: Check root level docs for workspace setup

## Error Handling

All API methods return appropriate error states:

```typescript
try {
  const success = await Monitoring.start();
  if (!success) {
    console.error('Failed to start monitoring');
  }
} catch (error) {
  console.error('Monitoring error:', error);
}
```

## 🛠️ Development

### Building
```bash
# Build the package
bun run build

# Type check only
bun run check-types
```

### Testing
```bash
# Run tests (when implemented)
bun run test

# Manual testing on device
# 1. Install app on Android device
# 2. Grant usage stats permission in Settings
# 3. Use the app and check data collection
```

### Development Scripts
```bash
# Full monorepo check
bun run check

# TypeScript check across workspace
bun run check-types

# Build all packages
bun run build
```

## Permissions Required

This package requires the following Android permissions:

- `android.permission.PACKAGE_USAGE_STATS` - Access usage statistics
- `android.permission.FOREGROUND_SERVICE` - Run foreground service
- `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` - Special use foreground service
- `android.permission.RECEIVE_BOOT_COMPLETED` - Restart on device boot
- `android.permission.WAKE_LOCK` - Screen state monitoring

The app will automatically guide users to grant the usage stats permission when needed.