# @mono/monitoring

Core monitoring functionality for Android usage analytics.

## Overview

This package provides the core monitoring APIs for tracking usage analytics on Android platforms. It focuses on low-level monitoring functionality without UI components, specifically designed for Android's usage stats and foreground services.

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

## Platform Support

- **Android**: Full foreground service with usage stats, screen monitoring, and background sync
- **Web/iOS**: TypeScript interface available for development, but functionality limited to Android

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

## Development

```bash
# Build the package
bun run build

# Open Android Studio for development
bun run open:android

# Lint code
bun run lint

# Run tests
bun run test
```

## Permissions Required

This package requires the following Android permissions:

- `android.permission.PACKAGE_USAGE_STATS` - Access usage statistics
- `android.permission.FOREGROUND_SERVICE` - Run foreground service
- `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` - Special use foreground service
- `android.permission.RECEIVE_BOOT_COMPLETED` - Restart on device boot
- `android.permission.WAKE_LOCK` - Screen state monitoring

The app will automatically guide users to grant the usage stats permission when needed.