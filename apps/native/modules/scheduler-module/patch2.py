import re

file_path = "android/src/main/java/expo/modules/scheduler/AlarmReceiver.kt"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

repl1_old = """        val alarmId = intent.getIntExtra("alarm_id", 0)
        val endTimeMs = intent.getLongExtra("end_time_ms", 0L)"""

repl1_new = """        val alarmId = intent.getIntExtra("alarm_id", 0)
        val endTimeMs = intent.getLongExtra("end_time_ms", 0L)
        val isPreAlarm = intent.getBooleanExtra("is_pre_alarm", false)
        val preAlarmOffset = intent.getIntExtra("pre_alarm_offset", 0)"""
content = content.replace(repl1_old, repl1_new)

repl2_old = """        // Launch AlarmActivity
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {"""

repl2_new = """        if (isPreAlarm) {
            Log.d(TAG, "⏰ Triggering PRE-ALARM ($preAlarmOffset mins left)")
            val preActivityIntent = Intent(context, PreAlarmActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("title", title)
                putExtra("pre_alarm_offset", preAlarmOffset)
            }
            try {
                Log.d(TAG, "⏰ Starting PreAlarmActivity...")
                context.startActivity(preActivityIntent)
            } catch (e: Exception) {
                Log.e(TAG, "❌ FAILED to start PreAlarmActivity: ${e.message}")
            }
            wakeLock.release()
            return
        }

        // Launch AlarmActivity
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {"""
content = content.replace(repl2_old, repl2_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("PATCH 2 DONE")
