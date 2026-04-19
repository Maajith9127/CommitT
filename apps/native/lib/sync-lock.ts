import { Logger } from './logger';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SYNC LOCK MUTEX V2 — The Database & Hardware Traffic Officer
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
 * V2 CHANGES (Deadlock Survivor Hardening):
 * ──────────────────────────────────────────
 * 1. OPERATION TIMEOUT: Every operation has a hard time limit (default 30s).
 *    If any operation exceeds this, the lock is forcibly released and the
 *    Promise chain is repaired. This prevents the "Zombie Lock" scenario
 *    where a hung Convex query permanently deadlocks the entire sync system.
 * 
 * 2. MANUAL RESYNC AWARENESS: A public flag (`isManualResyncActive`) allows
 *    the HydrationSync engine to detect when a manual resync is in progress
 *    and avoid fighting it with competing Amnesia-recovery cycles.
 * 
 * 3. COLD BOOT RESET: The `reset()` method allows the app's root provider
 *    to clear any theoretical stale state on a fresh process start.
 * 
 * PERFORMANCE RATIONALE:
 * Utilizing a Promise-chain queue ensures that writers wait in line without
 * wasting CPU cycles on polling or retrying. If a write fails, it resolves
 * the current chain link to prevent deadlocking the next writer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type DatabaseOperation<T> = () => Promise<T>;

/** Default maximum time (ms) any single lock-holder may occupy the lock. */
const DEFAULT_OPERATION_TIMEOUT_MS = 30_000; // 30 seconds

class SyncLock {
  /** The ongoing chain of database operations. Starts resolved. */
  private mutex: Promise<any> = Promise.resolve();
  
  /** Indicates if a write operation is currently holding the lock. */
  private _inProgress: boolean = false;

  /** The source name of whoever currently holds the lock (for diagnostics). */
  private _currentHolder: string | null = null;

  /** Timestamp when the current holder acquired the lock (for timeout diagnostics). */
  private _acquiredAt: number = 0;

  /**
   * PUBLIC FLAG: Manual Resync Awareness
   * ─────────────────────────────────────
   * When `true`, the HydrationSync engine should suppress all reconciliation
   * attempts. The ManualResync saga sets this before acquiring the lock and
   * clears it in its `finally` block.
   * 
   * WHY THIS EXISTS:
   * The ManualResync saga performs a multi-step sequence (nuke DB → clear token
   * → download from Convex → ingest → re-arm hardware) that takes 3-10 seconds.
   * During this window, if the user switches apps and triggers a foreground
   * transition, HydrationSync would see `token === null`, panic with "AMNESIA!",
   * and launch a competing download. Both would fight for the lock, and if the
   * ManualResync's Convex query is slow, the system enters the "Loop of Doom":
   *   → AMNESIA → query → wait for lock → timeout → AMNESIA → query → ...
   * 
   * This flag breaks that cycle by letting HydrationSync gracefully defer.
   */
  public isManualResyncActive: boolean = false;

  /**
   * execute
   * 
   * Queues an operation for exclusive execution with a hard timeout guard.
   * Use this to wrap ANY block that calls 'withTransactionAsync' or 
   * 'scheduleNextAlarm()'.
   * 
   * TIMEOUT BEHAVIOR:
   * If the operation exceeds `timeoutMs`, the lock is forcibly released and
   * the operation's Promise is rejected with a TimeoutError. The next queued
   * writer can then proceed, preventing permanent system deadlock.
   * 
   * @param sourceName - For debugging (e.g. "Saga:MoveTask", "Engine:Hydrate")
   * @param operation - The async function to execute once the lock is acquired.
   * @param timeoutMs - Maximum time (ms) this operation may hold the lock.
   * @returns The result of the operation.
   */
  async execute<T>(
    sourceName: string, 
    operation: DatabaseOperation<T>,
    timeoutMs: number = DEFAULT_OPERATION_TIMEOUT_MS
  ): Promise<T> {
    // 1. Snapshot the current tail of the promise chain
    const currentMutex = this.mutex;

    // 2. Wrap the operation in a way that captures the result/error safely
    const runOperation = async (): Promise<T> => {
      if (this._inProgress) {
         Logger.info(`🚦 [SyncLock] Disk is busy (held by "${this._currentHolder}"). "${sourceName}" is waiting in line...`);
      }

      try {
        await currentMutex; // Wait for whoever is in front of us to finish
      } catch (e) {
        // Person in front crashed, but the bridge is now clear for us.
      }

      this._inProgress = true;
      this._currentHolder = sourceName;
      this._acquiredAt = Date.now();
      Logger.info(` [SyncLock] Lock Acquired by "${sourceName}". Executing...`);
      
      try {
        /**
         * ───────────────────────────────────────────────────────────────
         * TIMEOUT GUARD ("Circuit Breaker")
         * ───────────────────────────────────────────────────────────────
         * Race the actual operation against a timeout timer. If the
         * operation completes first, great. If the timer fires first,
         * we reject with a clear error and release the lock so the
         * next writer in line doesn't starve forever.
         *
         * CRITICAL: We do NOT abort the underlying operation (we can't
         * cancel a native SQLite transaction or a Convex HTTP request).
         * We simply release the lock and let the operation's result be
         * discarded when it eventually resolves or rejects.
         * ───────────────────────────────────────────────────────────────
         */
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(
                `[SyncLock] TIMEOUT: "${sourceName}" exceeded ${timeoutMs}ms. ` +
                `Forcibly releasing lock to prevent system deadlock.`
              ));
            }, timeoutMs);
          })
        ]);
        return result;
      } finally {
        this._inProgress = false;
        this._currentHolder = null;
        Logger.info(` [SyncLock] Lock Released by "${sourceName}".`);
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

  /** Diagnostic: who currently holds the lock? */
  get currentHolder(): string | null {
    return this._currentHolder;
  }

  /**
   * reset()
   * ─────────────────────────────────────────────────────────────────────
   * COLD BOOT SAFETY VALVE
   * ─────────────────────────────────────────────────────────────────────
   * Called once during app initialization (e.g., in the root SQLiteProvider's
   * onInit callback). Ensures that if the process was killed while a lock
   * was held (swipe-kill, OOM kill, crash), the new process starts with a
   * completely clean slate.
   * 
   * Since the SyncLock is an in-memory Promise chain, a true process kill
   * already resets it. However, on some Android ROMs (notably Lenovo),
   * the process may survive a swipe-kill if an Accessibility Service is
   * active. This method provides an explicit reset for that edge case.
   */
  reset(): void {
    if (this._inProgress) {
      Logger.warn(
        `[SyncLock] COLD BOOT RESET: Clearing stale lock held by "${this._currentHolder}" ` +
        `(acquired ${Date.now() - this._acquiredAt}ms ago). This is expected after a crash or force-stop.`
      );
    }
    this.mutex = Promise.resolve();
    this._inProgress = false;
    this._currentHolder = null;
    this._acquiredAt = 0;
    this.isManualResyncActive = false;
  }
}

/**  Singleton instance shared across all hooks and systems. */
export const syncLock = new SyncLock();
