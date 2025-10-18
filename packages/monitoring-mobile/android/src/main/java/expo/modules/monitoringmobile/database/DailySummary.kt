package expo.modules.monitoringmobile.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "daily_summaries")
data class DailySummary(
    @PrimaryKey
    val date: String, // Format: "YYYY-MM-DD"
    val totalUsageTime: Long = 0, // in milliseconds
    val idleTime: Long = 0, // in milliseconds
    val sessionCount: Int = 0,
    val lastUpdated: Long = System.currentTimeMillis()
)