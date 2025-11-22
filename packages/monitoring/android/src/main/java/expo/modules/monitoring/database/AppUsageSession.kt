package expo.modules.monitoring.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_usage_sessions")
data class AppUsageSession(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val appPackage: String,
    val startTime: Long,
    val endTime: Long? = null,
    val duration: Long = 0, // in milliseconds
    val isActive: Boolean = true
)