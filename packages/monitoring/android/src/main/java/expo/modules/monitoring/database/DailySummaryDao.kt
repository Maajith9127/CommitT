package expo.modules.monitoring.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface DailySummaryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(summary: DailySummary)

    @Query("SELECT * FROM daily_summaries WHERE date = :date LIMIT 1")
    suspend fun getByDate(date: String): DailySummary?

    @Query("SELECT * FROM daily_summaries WHERE date >= :startDate AND date <= :endDate ORDER BY date DESC")
    suspend fun getSummariesInRange(startDate: String, endDate: String): List<DailySummary>

    @Query("SELECT SUM(totalUsageTime) FROM daily_summaries WHERE date >= :startDate AND date <= :endDate")
    suspend fun getTotalUsageTimeInRange(startDate: String, endDate: String): Long?

    @Query("SELECT SUM(idleTime) FROM daily_summaries WHERE date >= :startDate AND date <= :endDate")
    suspend fun getTotalIdleTimeInRange(startDate: String, endDate: String): Long?

    @Query("SELECT AVG(totalUsageTime) FROM daily_summaries WHERE date >= :startDate AND date <= :endDate")
    suspend fun getAverageUsageTime(startDate: String, endDate: String): Double?

    @Query("UPDATE daily_summaries SET totalUsageTime = totalUsageTime + :additionalTime, lastUpdated = :currentTime WHERE date = :date")
    suspend fun addUsageTime(date: String, additionalTime: Long, currentTime: Long)

    @Query("UPDATE daily_summaries SET idleTime = idleTime + :additionalTime, lastUpdated = :currentTime WHERE date = :date")
    suspend fun addIdleTime(date: String, additionalTime: Long, currentTime: Long)

    @Query("UPDATE daily_summaries SET sessionCount = sessionCount + 1, lastUpdated = :currentTime WHERE date = :date")
    suspend fun incrementSessionCount(date: String, currentTime: Long)

    // Flow for reactive queries
    @Query("SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 30")
    fun getRecentSummariesFlow(): Flow<List<DailySummary>>
}