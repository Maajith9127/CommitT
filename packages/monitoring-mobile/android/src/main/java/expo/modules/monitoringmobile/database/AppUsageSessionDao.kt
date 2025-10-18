package expo.modules.monitoringmobile.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface AppUsageSessionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: AppUsageSession): Long

    @Update
    suspend fun update(session: AppUsageSession)

    @Delete
    suspend fun delete(session: AppUsageSession)

    @Query("SELECT * FROM app_usage_sessions WHERE id = :id")
    suspend fun getById(id: Long): AppUsageSession?

    @Query("SELECT * FROM app_usage_sessions WHERE appPackage = :packageName AND isActive = 1 LIMIT 1")
    suspend fun getActiveSession(packageName: String): AppUsageSession?

    @Query("SELECT * FROM app_usage_sessions WHERE appPackage = :packageName AND startTime >= :startTime AND startTime <= :endTime ORDER BY startTime DESC")
    suspend fun getSessionsForApp(packageName: String, startTime: Long, endTime: Long): List<AppUsageSession>

    @Query("SELECT * FROM app_usage_sessions WHERE startTime >= :startTime AND startTime <= :endTime ORDER BY startTime DESC")
    suspend fun getSessionsInTimeRange(startTime: Long, endTime: Long): List<AppUsageSession>

    @Query("SELECT DISTINCT appPackage FROM app_usage_sessions WHERE startTime >= :startTime")
    suspend fun getUniqueApps(startTime: Long): List<String>

    @Query("SELECT SUM(duration) FROM app_usage_sessions WHERE startTime >= :startTime AND startTime <= :endTime")
    suspend fun getTotalUsageTime(startTime: Long, endTime: Long): Long?

    @Query("UPDATE app_usage_sessions SET isActive = 0 WHERE isActive = 1")
    suspend fun deactivateAllActiveSessions()

    // Flow for reactive queries
    @Query("SELECT * FROM app_usage_sessions ORDER BY startTime DESC")
    fun getAllSessionsFlow(): Flow<List<AppUsageSession>>
}