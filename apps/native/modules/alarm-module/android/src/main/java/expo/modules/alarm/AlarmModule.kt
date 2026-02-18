package expo.modules.alarm

import android.widget.Toast
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AlarmModule : Module() {

    override fun definition() = ModuleDefinition {

        // The name exposed to JavaScript
        Name("AlarmModule")

        // Show a native Android Toast message
        Function("showToast") { message: String ->
            val context = appContext.reactContext ?: return@Function
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}
