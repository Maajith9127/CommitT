package expo.modules.monitoring.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface NetworkEventDao {

    @Insert
    suspend fun insert(event: NetworkEvent): Long

    @Query("SELECT * FROM network_events WHERE timestamp >= :startTime AND timestamp <= :endTime ORDER BY timestamp DESC")
    suspend fun getEventsInTimeRange(startTime: Long, endTime: Long): List<NetworkEvent>

    @Query("SELECT DISTINCT networkType FROM network_events WHERE timestamp >= :startTime")
    suspend fun getUniqueNetworkTypes(startTime: Long): List<String>

    @Query("SELECT COUNT(*) FROM network_events WHERE networkType = :networkType AND timestamp >= :startTime AND timestamp <= :endTime")
    suspend fun getNetworkTypeCount(networkType: String, startTime: Long, endTime: Long): Int

    @Query("SELECT * FROM network_events ORDER BY timestamp DESC LIMIT 20")
    suspend fun getRecentEvents(): List<NetworkEvent>

    @Query("DELETE FROM network_events WHERE timestamp < :beforeTime")
    suspend fun deleteOldEvents(beforeTime: Long): Int

    // Flow for reactive queries
    @Query("SELECT * FROM network_events ORDER BY timestamp DESC LIMIT 10")
    fun getRecentEventsFlow(): Flow<List<NetworkEvent>>
}