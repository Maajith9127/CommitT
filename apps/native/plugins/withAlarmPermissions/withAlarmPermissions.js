const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Config Plugin: withAlarmPermissions
 *
 * Injects into AndroidManifest.xml:
 * - Alarm scheduling permissions
 * - AlarmReceiver (fires when alarm triggers)
 * - BootReceiver (re-schedules after phone restart)
 * - AlarmActivity (full-screen alarm overlay)
 */
function withAlarmPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // ── Permissions ────────────────────────────────────────────────────
    const permissions = [
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.WAKE_LOCK",
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.VIBRATE",
      "android.permission.POST_NOTIFICATIONS",
    ];

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    for (const perm of permissions) {
      const exists = manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === perm
      );
      if (!exists) {
        manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    // ── Application components ─────────────────────────────────────────
    const app = manifest.application?.[0];
    if (!app) return config;

    // --- AlarmReceiver ---
    if (!app.receiver) app.receiver = [];

    const hasAlarmReceiver = app.receiver.some(
      (r) => r.$?.["android:name"] === "expo.modules.scheduler.AlarmReceiver"
    );
    if (!hasAlarmReceiver) {
      app.receiver.push({
        $: {
          "android:name": "expo.modules.scheduler.AlarmReceiver",
          "android:exported": "false",
        },
      });
    }

    // --- BootReceiver ---
    const hasBootReceiver = app.receiver.some(
      (r) => r.$?.["android:name"] === "expo.modules.scheduler.BootReceiver"
    );
    if (!hasBootReceiver) {
      app.receiver.push({
        $: {
          "android:name": "expo.modules.scheduler.BootReceiver",
          "android:exported": "true",
          "android:directBootAware": "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: { "android:name": "android.intent.action.BOOT_COMPLETED" },
              },
              {
                $: { "android:name": "android.intent.action.LOCKED_BOOT_COMPLETED" },
              },
            ],
          },
        ],
      });
    }

    // --- AlarmActivity ---
    if (!app.activity) app.activity = [];

    const hasAlarmActivity = app.activity.some(
      (a) => a.$?.["android:name"] === "expo.modules.scheduler.AlarmActivity"
    );
    if (!hasAlarmActivity) {
      app.activity.push({
        $: {
          "android:name": "expo.modules.scheduler.AlarmActivity",
          "android:exported": "false",
          "android:launchMode": "singleTop",
          "android:excludeFromRecents": "true",
          "android:showOnLockScreen": "true",
          "android:turnScreenOn": "true",
          "android:theme": "@style/Theme.AppCompat.NoActionBar",
        },
      });
    }

    return config;
  });
}

module.exports = withAlarmPermissions;
