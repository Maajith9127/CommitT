# Declare Foreground Services and Request Permissions

In your app's manifest, declare each of your app's foreground services with a `<service>` element. For each service, use an `android:foregroundServiceType` attribute to declare what kind of work the service does.

In addition, request any permissions needed by your foreground services.

**Important:** All foreground service declarations must comply with the requirements in the Google Play Device and Network Abuse policy and the Google Play Understanding foreground service requirements documentation.

## Version Compatibility

The requirements for declaring your foreground services and requesting permissions vary depending on what API level your app targets. This page describes the requirements for apps that target API level 34 or higher. For information about changes to foreground services in earlier platform versions, see Changes to foreground services.

## Declare Foreground Services in the App Manifest

The following code shows how to declare a media playback foreground service. You might use a service like this to play music.

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" ...>
  <application ...>

    <service
        android:name=".MyMediaPlaybackService"
        android:foregroundServiceType="mediaPlayback"
        android:exported="false">
    </service>
  </application>
</manifest>
```

### Key Points About the Code

- In this example, the service has only one type, media. If multiple types apply to your service, separate them with the `|` operator. For example, if your service uses the camera and microphone, declare it like this:

  ```xml
  android:foregroundServiceType="camera|microphone"
  ```

- Depending on what API level your app targets, you may be required to declare foreground services in the app manifest. The requirements for specific API levels are described in Changes to foreground services.

- If you try to create a foreground service and its type isn't declared in the manifest, the system throws a `MissingForegroundServiceTypeException` upon calling `startForeground()`.

- Even when it isn't required, it's a best practice to declare all your foreground services and provide their service types.

## Request the Foreground Service Permissions

The following code shows how to request permissions for a foreground service that uses the camera.

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" ...>

    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA"/>

    <application ...>
        ...
    </application>
</manifest>
```

### Key Points About the Code

- This code uses best practices for an app that targets API level 34 or higher.