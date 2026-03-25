package expo.modules.applister

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream

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
     * Extracts and converts an app's native Drawable icon into a Base64 data URI.
     *
     * EDGE CASES HANDLED:
     *   1. BitmapDrawable — Direct `.bitmap` extraction (most common).
     *   2. AdaptiveIconDrawable / VectorDrawable — Rasterized onto a Canvas first,
     *      since these don't expose a `.bitmap` property.
     *   3. Icons with 0 intrinsic dimensions — Falls back to 96x96 default.
     *   4. Any unexpected exception — Returns `null` gracefully so the JS UI
     *      can fall back to a generic placeholder icon.
     *
     * @param pm     The device's PackageManager instance.
     * @param appInfo The ApplicationInfo for the target app.
     * @return A `data:image/png;base64,...` string, or `null` on failure.
     */
    private fun getBase64Icon(pm: PackageManager, appInfo: ApplicationInfo): String? {
        // Track Bitmaps we create so we can recycle them in `finally`,
        // preventing native heap leaks when processing 200+ app icons.
        var rasterizedBitmap: Bitmap? = null
        var scaledBitmap: Bitmap? = null

        try {
            val drawable = pm.getApplicationIcon(appInfo)

            // Step 1: Convert Drawable → Bitmap
            val bitmap = if (drawable is BitmapDrawable) {
                // Fast path: most app icons are already BitmapDrawables.
                // Do NOT recycle this — it's owned by the system's drawable cache.
                drawable.bitmap
            } else {
                // Slow path: AdaptiveIconDrawable (API 26+) or VectorDrawable
                // must be manually rasterized onto a Canvas. We OWN this bitmap.
                val bw = drawable.intrinsicWidth.takeIf { it > 0 } ?: 96
                val bh = drawable.intrinsicHeight.takeIf { it > 0 } ?: 96
                val b = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
                rasterizedBitmap = b // Mark for recycling
                val canvas = Canvas(b)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                b
            }

            // Step 2: Scale down to prevent memory bloat when sending 100+ icons
            // over the React Native JS bridge in a single payload.
            // createScaledBitmap returns the SAME object if dimensions already match,
            // so we only recycle if it's a genuinely new allocation.
            val scaled = Bitmap.createScaledBitmap(bitmap, ICON_SIZE, ICON_SIZE, true)
            if (scaled !== bitmap) {
                scaledBitmap = scaled // Mark for recycling only if it's a new object
            }

            // Step 3: Compress to PNG and encode as Base64
            val stream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.PNG, 100, stream)
            val byteArray = stream.toByteArray()
            stream.close()

            // Return as a data URI that React Native's <Image> can render directly
            return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
        } catch (e: Exception) {
            // Graceful degradation: JS side will show a fallback icon
            return null
        } finally {
            // CRITICAL: Always free native bitmap memory regardless of success/failure.
            // Without this, processing 200+ icons holds ~200MB of dead native heap
            // until GC eventually collects — causing ANR/OOM on low-RAM devices.
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
                val iconBase64 = getBase64Icon(pm, appInfo)

                // This Map auto-serializes to a JS Object over the bridge
                mapOf(
                    "id"         to packageName,   // Unique identifier (e.g. "com.google.chrome")
                    "name"       to appName,        // Human-readable label (e.g. "Chrome")
                    "iconBase64" to iconBase64,     // data:image/png;base64,... or null
                    "selected"   to false           // Default unselected; JS manages toggle state
                )
            }.sortedBy { it["name"].toString().lowercase() }
        }
    }
}
