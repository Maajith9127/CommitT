package expo.modules.alarm

import android.database.sqlite.SQLiteDatabase
import android.widget.Toast
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class AlarmModule : Module() {

    override fun definition() = ModuleDefinition {

        Name("AlarmModule")

        // Show a native Android Toast message
        Function("showToast") { message: String ->
            val context = appContext.reactContext ?: return@Function
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }

        // Read all tasks from the local expo-sqlite database
        Function("getLocalTasks") {
            readAllTasks()
        }

        // Read tasks and show them as a Toast
        Function("showTasksToast") {
            showTasksAsToast()
        }
    }

    private fun getDbFile(): File? {
        val context = appContext.reactContext ?: return null

        // expo-sqlite stores DBs at <filesDir>/SQLite/<dbName>
        val expoPath = File(context.filesDir, "SQLite/commit.db")
        if (expoPath.exists()) return expoPath

        // Fallback: standard Android database path
        val standardPath = context.getDatabasePath("commit.db")
        if (standardPath.exists()) return standardPath

        return null
    }

    private fun readAllTasks(): List<Map<String, Any?>> {
        val dbFile = getDbFile() ?: return emptyList()

        val db = SQLiteDatabase.openDatabase(
            dbFile.absolutePath,
            null,
            SQLiteDatabase.OPEN_READONLY
        )

        val tasks = mutableListOf<Map<String, Any?>>()

        try {
            val cursor = db.rawQuery("SELECT * FROM local_tasks", null)
            while (cursor.moveToNext()) {
                val task = mutableMapOf<String, Any?>()
                for (i in 0 until cursor.columnCount) {
                    val colName = cursor.getColumnName(i)
                    task[colName] = when (cursor.getType(i)) {
                        android.database.Cursor.FIELD_TYPE_NULL -> null
                        android.database.Cursor.FIELD_TYPE_INTEGER -> cursor.getLong(i)
                        android.database.Cursor.FIELD_TYPE_FLOAT -> cursor.getDouble(i)
                        android.database.Cursor.FIELD_TYPE_STRING -> cursor.getString(i)
                        android.database.Cursor.FIELD_TYPE_BLOB -> "[BLOB]"
                        else -> cursor.getString(i)
                    }
                }
                tasks.add(task)
            }
            cursor.close()
        } finally {
            db.close()
        }

        return tasks
    }

    private fun showTasksAsToast() {
        val context = appContext.reactContext ?: return
        val dbFile = getDbFile()

        if (dbFile == null) {
            Toast.makeText(context, "No local DB found", Toast.LENGTH_SHORT).show()
            return
        }

        val db = SQLiteDatabase.openDatabase(
            dbFile.absolutePath,
            null,
            SQLiteDatabase.OPEN_READONLY
        )

        try {
            val cursor = db.rawQuery("SELECT title FROM local_tasks", null)
            val titles = mutableListOf<String>()

            while (cursor.moveToNext()) {
                titles.add(cursor.getString(0))
            }
            cursor.close()

            val message = if (titles.isEmpty()) {
                "No tasks in local DB"
            } else {
                "Tasks (${titles.size}):\n${titles.joinToString("\n") { "• $it" }}"
            }

            Toast.makeText(context, message, Toast.LENGTH_LONG).show()
        } finally {
            db.close()
        }
    }
}
