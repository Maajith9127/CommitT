package expo.modules.enforcement

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EnforcementModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Enforcement")

        AsyncFunction("checkAllPermissions") {
            val context = appContext.reactContext ?: return@AsyncFunction mapOf<String, Boolean>()
            
            val accessibilityEnabled = isAccessibilityServiceEnabled(context)
            val overlayEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }

            mapOf(
                "accessibility" to accessibilityEnabled,
                "overlay" to overlayEnabled,
                "location" to true, // Placeholder for standard check
                "camera" to true,   // Placeholder for standard check
                "notifications" to true,
                "alarms" to true,
                "battery" to false
            )
        }

        Function("openSettings") { type: String ->
            val context = appContext.reactContext ?: return@Function
            val intent = when (type) {
                "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                "overlay" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                } else null
                else -> null
            }
            intent?.let {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(it)
            }
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        // Simple accurate check using Settings.Secure
        val expectedService = "${context.packageName}/expo.modules.blocker.BlockerAccessibilityService"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(expectedService)
    }
}
