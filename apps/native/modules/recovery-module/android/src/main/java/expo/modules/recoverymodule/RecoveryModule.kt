package expo.modules.recoverymodule

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.os.Process

class RecoveryModule : Module() {
  companion object {
    private const val TAG = "RecoveryModule"
  }

  override fun definition() = ModuleDefinition {
    Name("RecoveryModule")

    Function("nuclearReset") {
      Log.e(TAG, "==== [NUCLEAR RESET INITIATED] ====")
      Log.e(TAG, "React Native JS thread requested an immediate process termination.")
      
      // Catastrophic recovery mechanism. Executes a hard native PID kill on the Android process.
      Process.killProcess(Process.myPid())
      
      // System.exit(0) as a fallback just in case
      System.exit(0)
      
      mapOf("success" to true)
    }
  }
}
