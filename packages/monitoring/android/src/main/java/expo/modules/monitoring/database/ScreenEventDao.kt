package expo.modules.monitoring.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ScreenEventDao {

    @Insert
    suspend fun insert(event: ScreenEvent): Long

    @Insert
    suspend fun insertAll(events: List<ScreenEvent>)

    @Query("SELECT * FROM screen_events WHERE timestamp >= :startTime AND timestamp <= :endTime ORDER BY timestamp DESC")
    suspend fun getEventsInTimeRange(startTime: Long, endTime: Long): List<ScreenEvent>

    @Query("SELECT * FROM screen_events WHERE eventType = :eventType AND timestamp >= :startTime ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getEventsByType(eventType: String, startTime: Long, limit: Int = 100): List<ScreenEvent>

    @Query("SELECT COUNT(*) FROM screen_events WHERE eventType = :eventType AND timestamp >= :startTime AND timestamp <= :endTime")
    suspend fun getEventCount(eventType: String, startTime: Long, endTime: Long): Int

    @Query("SELECT timestamp FROM screen_events WHERE eventType = 'SCREEN_OFF' ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastScreenOffTime(): Long?

    @Query("SELECT timestamp FROM screen_events WHERE eventType = 'SCREEN_ON' ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLastScreenOnTime(): Long?

    @Query("DELETE FROM screen_events WHERE timestamp < :beforeTime")
    suspend fun deleteOldEvents(beforeTime: Long): Int

    // Flow for reactive queries
    @Query("SELECT * FROM screen_events ORDER BY timestamp DESC LIMIT 50")
    fun getRecentEventsFlow(): Flow<List<ScreenEvent>>
}