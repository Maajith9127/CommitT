# Troubleshoot Foreground Services

This page discusses some common reasons foreground services can fail and helps you identify what's causing the problem.

This document discusses the following issues:

- Application Not Responding (ANR) errors
  - Short service runs too long, causing ANR
- Foreground service exceptions
  - Internal exception: Timeout exceeded
  - Internal exception: ForegroundServiceDidNotStartInTimeException
  - ForegroundServiceStartNotAllowedException
  - SecurityException

## Before You Troubleshoot

### Check for Recent Changes to Foreground Services

If foreground services are used improperly, they can have negative effects on device performance and battery life. For this reason, Android platform releases often make changes to foreground service behavior to limit these bad effects.

If you're having trouble with foreground services, you should check the changes to foreground services documentation and see if there are any recent changes that could explain your problems. It is particularly important to check for changes under these circumstances:

- Foreground service code that previously worked is now failing
- You have just started testing on a new platform release, or you have changed the API level targeted by your app

In addition, if you are testing your device on a developer preview of the platform, make sure to check the most recent version of the developer preview documentation.

## Application Not Responding (ANR) Errors

Under certain circumstances, an app is expected to shut down its foreground service. If the app does not stop the service, the system stops the service and triggers an Application Not Responding (ANR) error.

### Short Service Runs Too Long Causing ANR

Foreground services that use the short service type must complete quickly, within about three minutes. When the time runs out, the system calls the service's `Service.onTimeout(int,int)` method. The service has a few seconds to call `stopSelf()`. If the service does not stop itself, the system triggers an Application Not Responding error.

**Note:** Media processing and data sync foreground services also have time limits, though the limit is longer. If one of those services runs too long, the system sends an internal exception causing the app to crash. For more information, see Time-limited foreground service does not shut down causing app to crash.

**Diagnose:**

If the ANR was caused by a foreground service failing to stop itself, the system throws an internal exception. You can verify that this was the issue by checking the ANR reports. If this is the problem, the report will include the following message:

```
Fatal Exception: android.app.RemoteServiceException: "A foreground service of
type FOREGROUND_SERVICE_TYPE_SHORT_SERVICE did not stop within its timeout:
[component name]"
```

**Fix:**

- Make sure that all time-limited foreground services finish their work and call `stopForeground(int)` within the system time limit.
- Have your foreground services implement `Service.onTimeout(int,int)`. Make sure your implementation of that method calls `stopSelf()` right away.

## Foreground Service Exceptions

This section describes several foreground service issues that can cause the system to throw an exception. If the app does not catch the exception, the user sees a dialog telling them that the app has stopped.

In some cases, the system throws an internal exception. In those cases you can find out what the exception was by looking in the stack trace, and you can check Logcat for more detailed error information.

### Internal Exception: Timeout Exceeded

The system imposes a limit on how long data sync and media processing foreground services can run while the app is in the background. If the service exceeds that limit, the system calls the service's `Service.onTimeout(int,int)` method. The service has a few seconds to call `stopSelf()`. If the service does not stop itself, the system generates an internal `RemoteServiceException` causing the app to crash.

**Note:** The short service foreground service type has even stricter time limits. If a short service runs too long, the system generates an ANR. For more information, see Short service runs too long causing ANR.

**Diagnose:**

You can find out what the exception was by looking in the stack trace, and you can check Logcat for more detailed error information. In this case, Logcat has the following error message:

```
Fatal Exception: android.app.RemoteServiceException: "A foreground service of
type [service type] did not stop within its timeout: [component name]"
```

**Fix:**

- Make sure that all time-limited foreground services finish their work and call `stopForeground(int)` within the system time limit.
- Have your foreground services implement `Service.onTimeout(int,int)`. Make sure your implementation of that method calls `stopSelf()` right away.

### Internal Exception: ForegroundServiceDidNotStartInTimeException

When you launch a service by calling `context.startForegroundService()`, that service has a few seconds to promote itself to a foreground service by calling `ServiceCompat.startForeground()`. If the service does not do so, the throws an internal `ForegroundServiceDidNotStartInTimeException`.

**Diagnose:**

You can find out what the exception was by looking in the stack trace, and you can check Logcat for more detailed error information. In this case, Logcat has the following error message:

```
android.app.RemoteServiceException$ForegroundServiceDidNotStartInTimeException:
Context.startForegroundService() did not then call Service.startForeground()
```

**Fix:**

Make sure that all newly-created foreground services call `ServiceCompat.startForeground()` within a few seconds.

### ForegroundServiceStartNotAllowedException

**Error:**

System throws `ForegroundServiceStartNotAllowedException`.

**Cause:**

This is usually caused by the app launching a foreground service from the background when there is no valid exemption.

Beginning with Android 12 (API level 31), apps are not allowed to start foreground services while the app is running in the background, with a few specific exemptions. If you attempt to start a foreground service from the background and you don't meet the requirements of one of the exemptions, the system throws `ForegroundServiceStartNotAllowedException`. The system also does this if you don't meet the requirements of the exemption.

For example, an app might have a button that a user can click, which causes the app to do some processing and then launch a foreground service. In this case, there's the danger that the user might click the button then immediately put the app in the background. The app would then try to launch the service from the background. If the app does not meet one of the specified exemptions, the system throws a `ForegroundServiceStartNotAllowedException`.

In addition, some exemptions have a short time limit. For example, there is a brief exemption if your app launches a foreground service in response to a high-priority FCM message. If you don't launch the service quickly enough, you get a `ForegroundServiceStartNotAllowedException`.

Specific exemptions sometimes become more restrictive with new Android releases. If you have changed which version of Android your app is targeting, check the changes to foreground services documentation and confirm that your app still meets one of the permitted exemptions.

**Fix:**

- Change your app's workflow so it does not need to launch foreground services while the app is in the background, or confirm that your app meets one of the exemptions.
- You can use lifecycle-aware components to manage your app's lifecycle so you don't inadvertently try to launch a foreground service from the background.

### SecurityException

**Error:**

System throws `SecurityException`.

**Cause:**

Your app attempted to launch a foreground service without having the necessary permissions.

- If an app targets Android 9 (API level 28) or higher, it must have the `FOREGROUND_SERVICE` permission to launch a foreground service.
- If an app targets Android 14 (API level 34) or higher, it must meet all of the prerequisites for its foreground service type. These prerequisites are detailed in the foreground service types documentation. In particular, be aware of the following requirements:
  - Several foreground service types require specific runtime permissions. For example, a remote messaging foreground service must have the `FOREGROUND_SERVICE_REMOTE_MESSAGING` permission.
- In several cases, there are additional while-in-use restrictions on permissions needed by some foreground service types. These permissions are only granted to the app while the app is in the foreground (with a few specific exceptions). This means that even if your app has requested and been granted one of these permissions, if the app tries to launch the foreground service while the app is in the background, the system will throw a `SecurityException` even if the app has an exemption to start a foreground service from the background. For more information, see Restrictions on starting foreground services that need while-in-use permissions.
  - You may get a `SecurityException` if you requested necessary permissions but you start the foreground service before confirming that the required permissions were granted.

**Fix:**

Before you launch the foreground service, request all the appropriate foreground service permissions, and confirm that you've met all other runtime prerequisites.