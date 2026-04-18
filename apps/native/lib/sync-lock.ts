import { Logger } from './logger';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SYNC LOCK MUTEX — The Database & Hardware Traffic Officer
 * ─────────────────────────────────────────────────────────────────────────────
 * SQLite (via expo-sqlite) is a single-writer database. If multiple JavaScript
 * 'threads' (e.g., Background Hydration vs. User Sagas) attempt to open
 * concurrent transactions, the native bridge throws 'Busy' or 'Locked' errors.
 * 
 * Additionally, if both threads try to update the Hardware Alarms at the 
 * exact same time, the Android Blocker can become confused ("Ghost Blocking").
 * 
 * This singleton Mutex provides a high-performance Promise Queue that 
 * serializes ALL database writes and hardware sync triggers across the 
 * entire application.
 * 
 * PERFORMANCE RATIONALE:
 * Utilizing a Promise-chain queue ensures that writers wait in line without
 * wasting CPU cycles on polling or retrying. If a write fails, it resolves
 * the current chain link to prevent deadlocking the next writer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type DatabaseOperation<T> = () => Promise<T>;

class SyncLock {
  /** The ongoing chain of database operations. Starts resolved. */
  private mutex: Promise<any> = Promise.resolve();
  
  /** Indicates if a write operation is currently holding the lock. */
  private _inProgress: boolean = false;

  /**
   * execute
   * 
   * Queues an operation for exclusive execution. 
   * Use this to wrap ANY block that calls 'withTransactionAsync' or 
   * 'scheduleNextAlarm()'.
   * 
   * @param sourceName - For debugging (e.g. "Saga:MoveTask", "Engine:Hydrate")
   * @param operation - The async function to execute once the lock is acquired.
   * @returns The result of the operation.
   */
  async execute<T>(sourceName: string, operation: DatabaseOperation<T>): Promise<T> {
    // 1. Snapshot the current tail of the promise chain
    const currentMutex = this.mutex;

    // 2. Wrap the operation in a way that captures the result/error safely
    const runOperation = async (): Promise<T> => {
      if (this._inProgress) {
         Logger.info(`🚦 [SyncLock] Disk is busy. "${sourceName}" is waiting in line...`);
      }

      try {
        await currentMutex; // Wait for whoever is in front of us to finish
      } catch (e) {
        // Person in front crashed, but the bridge is now clear for us.
      }

      this._inProgress = true;
      Logger.info(`🟢 [SyncLock] Lock Acquired by "${sourceName}". Executing...`);
      
      try {
        return await operation();
      } finally {
        this._inProgress = false;
        Logger.info(`🔴 [SyncLock] Lock Released by "${sourceName}".`);
      }
    };

    // 3. Update the global mutex to wait for our new operation
    const nextPromise = runOperation();
    
    // We update the chain with a 'quiet' version of our result so that 
    // a crash in our Saga doesn't kill the entire background engine.
    this.mutex = nextPromise.catch((err) => {
       Logger.error(`[SyncLock] FATAL ERROR inside lock for "${sourceName}":`, err);
    });

    return nextPromise;
  }

  /** Status check for UI/Debugging */
  get inProgress(): boolean {
    return this._inProgress;
  }
}

/** 🛡️ Singleton instance shared across all hooks and systems. */
export const syncLock = new SyncLock();
