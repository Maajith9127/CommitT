# Restrictions on Starting a Foreground Service from the Background

Apps that target Android 12 (API level 31) or higher can't start foreground services while the app is running in the background, except for a few special cases. If an app tries to start a foreground service while the app runs in the background, and the foreground service doesn't satisfy one of the exceptional cases, the system throws a `ForegroundServiceStartNotAllowedException`.

**Note:** If one app calls `Context.startForegroundService()` to start a foreground service that another app owns, these restrictions apply only if both apps target Android 12 or higher.

In addition, if an app wants to launch a foreground service that needs while-in-use permissions (for example, body sensor, camera, microphone, or location permissions), it cannot create the service while the app is in the background, even if the app falls into one of the exemptions from background start restrictions. The reason for this is explained in the section Restrictions on starting foreground services that need while-in-use permissions.

## Exemptions from Background Start Restrictions

In the following situations, your app can start foreground services even while your app runs in the background:

- Your app transitions from a user-visible state, such as an activity.
- Your app can start an activity from the background, except for the case where the app has an activity in the back stack of an existing task.

- Your app receives a high priority message using Firebase Cloud Messaging.

  **Note:** The system can downgrade the high priority messages to normal priority if the app is not using the high priority messages for surfacing time sensitive content to the user. If the message's priority is downgraded, your app cannot start a foreground service and attempting to start one results in a `ForegroundServiceStartNotAllowedException`.

  So, it's recommended to check the result of `RemoteMessage.getPriority()` and confirm it's `PRIORITY_HIGH()` before attempting to start a foreground service. For guidance on high priority messages and when to use them, refer to FCM's documentation.

- The user performs an action on a UI element related to your app. For example, they might interact with a bubble, notification, widget, or activity.

- Your app invokes an exact alarm to complete an action that the user requests.

- Your app is the device's current input method.

- Your app receives an event that's related to geofencing or activity recognition transition.

- After the device reboots and receives the `ACTION_BOOT_COMPLETED`, `ACTION_LOCKED_BOOT_COMPLETED`, or `ACTION_MY_PACKAGE_REPLACED` intent action in a broadcast receiver.

  **Note:** If your app targets Android 14 or higher, there are restrictions on launching certain foreground service types from a BOOT_COMPLETED receiver. For more information, see Restrictions on BOOT_COMPLETED broadcast receivers launching foreground services.

- Your app receives the `ACTION_TIMEZONE_CHANGED`, `ACTION_TIME_CHANGED`, or `ACTION_LOCALE_CHANGED` intent action in a broadcast receiver.

- Your app receives the `ACTION_TRANSACTION_DETECTED` event from `NfcService`.

- Apps with certain system roles or permission, such as device owners and profile owners.

- Your app uses the Companion Device Manager and declares the `REQUEST_COMPANION_START_FOREGROUND_SERVICES_FROM_BACKGROUND` permission or the `REQUEST_COMPANION_RUN_IN_BACKGROUND` permission. Whenever possible, use `REQUEST_COMPANION_START_FOREGROUND_SERVICES_FROM_BACKGROUND`.

- The user turns off battery optimizations for your app.

- Your app holds the `SYSTEM_ALERT_WINDOW` permission. **Note:** If your app targets Android 15 or higher, it must have the `SYSTEM_ALERT_WINDOW` permission and the app must currently have a visible overlay window.

## Restrictions on Starting Foreground Services that Need While-in-Use Permissions

On Android 14 (API level 34) or higher, there are special situations to be aware of if you're starting a foreground service that needs while-in-use permissions.

If your app targets Android 14 or higher, the operating system checks when you create a foreground service to make sure your app has all the appropriate permissions for that service type. For example, when you create a foreground service of type microphone, the operating system verifies that your app currently has the `RECORD_AUDIO` permission. If you don't have that permission, the system throws a `SecurityException`.

For while-in-use permissions, this causes a potential problem. If your app has a while-in-use permission, it only has that permission while it's in the foreground. This means if your app is in the background, and it tries to create a foreground service of type camera, location, or microphone, the system sees that your app doesn't currently have the required permissions, and it throws a `SecurityException`.

Similarly, if your app is in the background and it creates a health service that needs the `BODY_SENSORS` permission, the app doesn't currently have that permission, and the system throws an exception. (This doesn't apply if it's a health service that needs different permissions, like `ACTIVITY_RECOGNITION`.) Calling `PermissionChecker.checkSelfPermission()` does not prevent this problem. If your app has a while-in-use permission, and it calls `checkSelfPermission()` to check if it has that permission, the method returns `PERMISSION_GRANTED` even if the app is in the background. When the method returns `PERMISSION_GRANTED`, it's saying "your app has this permission while the app is in use."

**Note:** On versions of Android lower than Android 14, if you tried to create a foreground service that needed while-in-use permissions while your app was in the background, the system would let you create the service, but the service wouldn't have access to the needed resources, and if it tried to use them, you'd get an exception. On Android 14 or higher, your app gets the exception as soon as it tries to create the foreground service.

For this reason, if your foreground service needs a while-in-use permission, you must call `Context.startForegroundService()` or `Context.bindService()` while your app has a visible activity, unless the service falls into one of the defined exemptions.

## Exemptions from Restrictions on While-in-Use Permissions

In some situations, even if a foreground service is started while the app runs in the background, it can still access location, camera, and microphone information while the app runs in the foreground ("while-in-use").

In these same situations, if the service declares a foreground service type of location and is started by an app that has the `ACCESS_BACKGROUND_LOCATION` permission, this service can access location information all the time, even when the app runs in the background.

The following list contains these situations:

- A system component starts the service.
- The service starts by interacting with app widgets.
- The service starts by interacting with a notification.
- The service starts as a `PendingIntent` that is sent from a different, visible app.
- The service starts by an app that is a device policy controller that runs in device owner mode.
- The service starts by an app which provides the `VoiceInteractionService`.
- The service starts by an app that has the `START_ACTIVITIES_FROM_BACKGROUND` privileged permission.

## Determine Which Services Are Affected in Your App

When testing your app, start its foreground services. If a started service has restricted access to location, microphone, and camera, the following message appears in Logcat:

```
Foreground service started from background can not have \
location/camera/microphone access: service SERVICE_NAME
```