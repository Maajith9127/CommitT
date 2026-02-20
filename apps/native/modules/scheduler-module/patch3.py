import re

file_path = "android/src/main/java/expo/modules/scheduler/AlarmScheduler.kt"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

repl1_old = """                    val alarmId = (convexId.hashCode() and 0x7FFFFFFF)

                    // If saved fire time is still in the future, reuse it directly"""

repl1_new = """                    val alarmId = (convexId.hashCode() and 0x7FFFFFFF)
                    val preAlarmsArray = entry.optJSONArray("preAlarms") ?: JSONArray()

                    // If saved fire time is still in the future, reuse it directly"""
content = content.replace(repl1_old, repl1_new)


repl2_old = """                    if (savedFireAtMs > now) {
                        Log.d(TAG, "⏰ '$title': saved fire time ${formatTime(savedFireAtMs)} is still in the future (${(savedFireAtMs - now) / 1000}s away). Reusing it.")
                        setAlarm(context, alarmId, savedFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs)
                        Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(savedFireAtMs)} (reused saved time)")

                    }"""

repl2_new = """                    if (savedFireAtMs > now) {
                        Log.d(TAG, "⏰ '$title': saved fire time ${formatTime(savedFireAtMs)} is still in the future (${(savedFireAtMs - now) / 1000}s away). Reusing it.")
                        setAlarm(context, alarmId, savedFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs)
                        Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(savedFireAtMs)} (reused saved time)")
                        
                        for (i in 0 until preAlarmsArray.length()) {
                            val pObj = preAlarmsArray.getJSONObject(i)
                            val offset = pObj.getInt("offset")
                            val pFireAtMs = pObj.getLong("fireAtMs")
                            val pAlarmId = pObj.getInt("alarmId")
                            if (pFireAtMs > now) {
                                setAlarm(context, pAlarmId, pFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs, true, offset)
                            }
                        }
                    }"""
content = content.replace(repl2_old, repl2_new)


repl3_old = """                            val fireNow = now + 30_000
                            Log.d(TAG, "🚨 '$title': saved fire time ${formatTime(savedFireAtMs)} was missed ${missedByMin}min ago (during boot). FIRING NOW in 30s!")
                            setAlarm(context, alarmId, fireNow, convexId, title, recurrenceJson, savedEndTimeMs)

                            // Update boot storage with the immediate fire time
                            val updatedEntry = JSONObject().apply {
                                put("convexId", convexId)
                                put("title", title)
                                put("recurrenceJson", recurrenceJson)
                                put("fireAtMs", fireNow)
                                put("endTimeMs", savedEndTimeMs)
                            }
                            alarms.put(convexId, updatedEntry)

                            Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(fireNow)} (immediate — missed during boot)")

                        }"""

repl3_new = """                            val fireNow = now + 30_000
                            Log.d(TAG, "🚨 '$title': saved fire time ${formatTime(savedFireAtMs)} was missed ${missedByMin}min ago (during boot). FIRING NOW in 30s!")
                            setAlarm(context, alarmId, fireNow, convexId, title, recurrenceJson, savedEndTimeMs)

                            // Update boot storage with the immediate fire time
                            val updatedEntry = JSONObject().apply {
                                put("convexId", convexId)
                                put("title", title)
                                put("recurrenceJson", recurrenceJson)
                                put("fireAtMs", fireNow)
                                put("endTimeMs", savedEndTimeMs)
                                put("preAlarms", preAlarmsArray) // maintain them, some might still be future
                            }
                            alarms.put(convexId, updatedEntry)
                            
                            for (i in 0 until preAlarmsArray.length()) {
                                val pObj = preAlarmsArray.getJSONObject(i)
                                val offset = pObj.getInt("offset")
                                val pFireAtMs = pObj.getLong("fireAtMs")
                                val pAlarmId = pObj.getInt("alarmId")
                                if (pFireAtMs > now) {
                                    setAlarm(context, pAlarmId, pFireAtMs, convexId, title, recurrenceJson, savedEndTimeMs, true, offset)
                                }
                            }

                            Log.d(TAG, "✅ Re-scheduled '$title' → ${formatTime(fireNow)} (immediate — missed during boot)")

                        }"""
content = content.replace(repl3_old, repl3_new)

repl4_old = """                                // Update boot storage with new fire time
                                val updatedEntry = JSONObject().apply {
                                    put("convexId", convexId)
                                    put("title", title)
                                    put("recurrenceJson", recurrenceJson)
                                    put("fireAtMs", nextSlot.startTimeMs)
                                    put("endTimeMs", nextSlot.endTimeMs)
                                }
                                alarms.put(convexId, updatedEntry)"""

repl4_new = """                                // Update boot storage with new fire time
                                val newPreAlarms = JSONArray()
                                for (i in 0 until preAlarmsArray.length()) {
                                    val pObj = preAlarmsArray.getJSONObject(i)
                                    val offset = pObj.getInt("offset")
                                    val pAlarmId = pObj.getInt("alarmId")
                                    val newPFireAtMs = nextSlot.startTimeMs - (offset * 60 * 1000L)
                                    if (newPFireAtMs > now) {
                                        setAlarm(context, pAlarmId, newPFireAtMs, convexId, title, recurrenceJson, nextSlot.endTimeMs, true, offset)
                                        val newPObj = JSONObject()
                                        newPObj.put("offset", offset)
                                        newPObj.put("fireAtMs", newPFireAtMs)
                                        newPObj.put("alarmId", pAlarmId)
                                        newPreAlarms.put(newPObj)
                                    }
                                }

                                val updatedEntry = JSONObject().apply {
                                    put("convexId", convexId)
                                    put("title", title)
                                    put("recurrenceJson", recurrenceJson)
                                    put("fireAtMs", nextSlot.startTimeMs)
                                    put("endTimeMs", nextSlot.endTimeMs)
                                    put("preAlarms", newPreAlarms)
                                }
                                alarms.put(convexId, updatedEntry)"""
content = content.replace(repl4_old, repl4_new)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("PATCH 3 DONE")
