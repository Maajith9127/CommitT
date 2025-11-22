package expo.modules.monitoring.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "screen_events")
data class ScreenEvent(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val timestamp: Long,
    val eventType: String, // "SCREEN_ON", "SCREEN_OFF", "USER_PRESENT"
    val sessionId: Long? = null // Link to usage session if applicable
)