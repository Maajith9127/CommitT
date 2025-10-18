package expo.modules.monitoringmobile.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        AppUsageSession::class,
        ScreenEvent::class,
        DailySummary::class,
        NetworkEvent::class
    ],
    version = 1,
    exportSchema = true
)
abstract class MonitoringDatabase : RoomDatabase() {

    abstract fun appUsageSessionDao(): AppUsageSessionDao
    abstract fun screenEventDao(): ScreenEventDao
    abstract fun dailySummaryDao(): DailySummaryDao
    abstract fun networkEventDao(): NetworkEventDao

    companion object {
        private const val DATABASE_NAME = "monitoring_database"

        @Volatile
        private var INSTANCE: MonitoringDatabase? = null

        fun getInstance(context: Context): MonitoringDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MonitoringDatabase::class.java,
                    DATABASE_NAME
                )
                    .addMigrations(*getMigrations())
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private fun getMigrations(): Array<Migration> {
            // Add migrations here when database schema changes
            return arrayOf()
        }
    }
}