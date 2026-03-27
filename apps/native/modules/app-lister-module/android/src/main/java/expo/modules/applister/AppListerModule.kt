package expo.modules.applister

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

/**
 * AppListerModule — Native Expo Module (Android Only)
 *
 * PURPOSE:
 *   Exposes a single async function `getInstalledApps()` to the React Native
 *   JavaScript layer. Returns every user-visible application installed on the
 *   device, along with its human-readable name, package ID, and a lightweight
 *   Base64-encoded PNG icon suitable for direct rendering in `<Image>`.
 *
 * WHY NATIVE?
 *   React Native / Expo have zero built-in APIs for querying the device's
 *   installed application list. The Android `PackageManager` is the only way
 *   to retrieve this data, and it requires native Kotlin code.
 *
 * REQUIRED PERMISSION:
 *   `android.permission.QUERY_ALL_PACKAGES` — declared in this module's own
 *   AndroidManifest.xml. Without it, Android 11+ (API 30) returns an empty
 *   list due to package visibility restrictions.
 *
 * PLAY STORE NOTE:
 *   Google audits `QUERY_ALL_PACKAGES`. Our use-case (app blocker / digital
 *   wellbeing) is an approved category. Include justification in the Play
 *   Console "Permissions Declaration" form when submitting for review.
 *
 * DATA FLOW:
 *   JS calls `AppListerModule.getInstalledApps()`
 *     → Kotlin queries `PackageManager.getInstalledApplications()`
 *     → Filters out non-launchable background services
 *     → Extracts each app's icon Drawable → Bitmap → Base64 PNG
 *     → Returns sorted `List<Map>` which auto-bridges to a JS Array of Objects
 *
 * @see modules/app-lister-module/index.ts — TypeScript bridge & type definitions
 * @see components/ui/blocklist/SelectableListItem.tsx — UI consumer of this data
 */
class AppListerModule : Module() {

    companion object {
        /** Target icon size in pixels. Chosen to balance visual clarity vs memory.
         *  100x100 keeps each Base64 string ~8-12KB, preventing OOM on 300+ apps. */
        private const val ICON_SIZE = 100
    }

    /**
     * Extracts and saves an app's icon as a PNG in the local cache directory.
     */
    private fun getIconUri(pm: PackageManager, appInfo: ApplicationInfo): String? {
        val context = appContext.reactContext ?: return null
        val packageName = appInfo.packageName
        
        val iconDir = File(context.cacheDir, "app_icons")
        if (!iconDir.exists()) iconDir.mkdirs()
        
        val iconFile = File(iconDir, "$packageName.png")
        
        // Return existing if present (Sync logic can clear this dir if needed)
        if (iconFile.exists()) {
            return android.net.Uri.fromFile(iconFile).toString()
        }

        var rasterizedBitmap: Bitmap? = null
        var scaledBitmap: Bitmap? = null

        try {
            val drawable = pm.getApplicationIcon(appInfo)

            val bitmap = if (drawable is BitmapDrawable) {
                drawable.bitmap
            } else {
                val bw = drawable.intrinsicWidth.takeIf { it > 0 } ?: 96
                val bh = drawable.intrinsicHeight.takeIf { it > 0 } ?: 96
                val b = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
                rasterizedBitmap = b
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                b
            }

            val scaled = Bitmap.createScaledBitmap(bitmap, ICON_SIZE, ICON_SIZE, true)
            if (scaled !== bitmap) {
                scaledBitmap = scaled
            }

            FileOutputStream(iconFile).use { out ->
                scaled.compress(Bitmap.CompressFormat.PNG, 100, out)
            }

            return android.net.Uri.fromFile(iconFile).toString()
        } catch (e: Exception) {
            return null
        } finally {
            scaledBitmap?.recycle()
            rasterizedBitmap?.recycle()
        }
    }

    /**
     * Expo Module Definition — registers the module name and its exposed functions.
     *
     * IMPORTANT: The `Name("AppListerModule")` must exactly match the string used
     * in `requireNativeModule("AppListerModule")` on the TypeScript side.
     */
    override fun definition() = ModuleDefinition {
        Name("AppListerModule")

        /**
         * getInstalledApps() → Promise<Array<{ id, name, iconBase64, selected }>>
         *
         * Uses `AsyncFunction` (not `Function`) so the heavy PackageManager query
         * and Bitmap processing run off the main UI thread. This prevents any
         * visible frame drops or ANR (Application Not Responding) dialogs.
         *
         * FILTERING STRATEGY:
         *   We intentionally do NOT use `ApplicationInfo.FLAG_SYSTEM` because it
         *   incorrectly hides pre-installed consumer apps (YouTube, Chrome, Maps).
         *   Instead, we use `getLaunchIntentForPackage()` — if an app has no launch
         *   intent, it's an invisible background service the user can't open from
         *   the app drawer and therefore has no reason to block.
         */
        AsyncFunction("getInstalledApps") { ->
            val context = appContext.reactContext
                ?: throw Exception("React context is null — module accessed before app initialization.")

            val pm = context.packageManager
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)

            packages.mapNotNull { appInfo ->
                // Filter: Only include apps that the user can actually open.
                // This elegantly excludes system daemons, shared libraries, and
                // hidden OEM services while keeping Chrome, YouTube, Instagram, etc.
                val launchIntent = pm.getLaunchIntentForPackage(appInfo.packageName)
                if (launchIntent == null && context.packageName != appInfo.packageName) {
                    return@mapNotNull null
                }

                val appName = pm.getApplicationLabel(appInfo).toString()
                val packageName = appInfo.packageName
                val iconUri = getIconUri(pm, appInfo)

                mapOf(
                    "id"      to packageName,
                    "name"    to appName,
                    "iconUri" to iconUri
                )
            }.sortedBy { it["name"].toString().lowercase() }
        }
    }
}
