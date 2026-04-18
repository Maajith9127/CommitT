import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILE = `${FileSystem.documentDirectory}commit-t-debug.log`;
const MAX_LOG_SIZE = 500 * 1024; // 500KB - prevents the file from eating storage

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRO-GRADE ASYNC LOGGER (The "Black Box Flight Recorder")
 * ─────────────────────────────────────────────────────────────────────────────
 * This logger solves two massive problems:
 * 
 * 1. ASYNC BUFFERING (Zero DB Blocking)
 *    Instead of physically reading/writing to the disk every time you call 
 *    Logger.info(), which slows down SQLite and causes "Busy" errors, this 
 *    logger instantly stores the log in memory and returns. A background worker
 *    batches the logs and writes them to disk quietly without blocking the app.
 * 
 * 2. AUTO-TRACING (Call Site Targeting)
 *    It uses the JavaScript Error Stack to automatically identify exactly WHICH
 *    file and WHICH line number fired the log. You no longer have to manually 
 *    type "[SyncEngine]" because the logger knows where it is.
 * ─────────────────────────────────────────────────────────────────────────────
 */
class AsyncLogger {
  private logQueue: string[] = [];
  private isWriting = false;

  /**
   * Dissects the Call Stack to find exactly who called the Logger.
   * Format: `filename:line_number`
   */
  private getCallerInfo(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'UnknownLocation';
      
      const lines = stack.split('\n');
      for (const line of lines) {
         // Skip the inner logger functions and the Error itself
         if (line.includes('logger.ts') || line.trim() === 'Error' || line.includes('Logger.getCallerInfo')) {
             continue;
         }
         
         // Hermes engine (React Native) compiles everything into InternalBytecode 
         // so file names are lost unless source maps are resolved.
         if (line.includes('InternalBytecode')) {
           return 'Hermes';
         }

         // Extract standard JS/TS stack signatures e.g., (file.tsx:10:5)
         const match = line.match(/([a-zA-Z0-9_\-\.]+)\.[a-zA-Z]+:(\d+):\d+/);
         if (match) {
           return `${match[1]}:${match[2]}`; // Returns e.g. "sync-engine:128"
         }
         
         const fileMatch = line.match(/([a-zA-Z0-9_\-\.]+)\.(ts|tsx|js)/);
         if (fileMatch) {
            return fileMatch[1];
         }
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * The Main Log Entry Point
   * This is instantaneous. It queues the log and releases the thread.
   */
  log(level: 'INFO' | 'WARN' | 'ERROR', message: string, extra?: any) {
    const timestamp = new Date().toISOString();
    const caller = this.getCallerInfo();
    const callerTag = caller === 'Hermes' || caller === 'Unknown' ? '' : ` [${caller}]`;
    
    // Pretty-print the JSON objects if they are provided so it's readable
    const extraStr = extra ? `\n    └─ DATA: ${JSON.stringify(extra, null, 2).replace(/\n/g, '\n       ')}` : '';
    const entry = `[${timestamp}] [${level}]${callerTag} ${message}${extraStr}\n`;

    // 1. Console Output for Dev Mode
    if (level === 'ERROR') console.error(`[${caller}] ${message}`, extra || '');
    else if (level === 'WARN') console.warn(`[${caller}] ${message}`, extra || '');
    else console.log(`[${caller}] ${message}`, extra || '');

    // 2. Queue for Background Disk Write
    this.logQueue.push(entry);
    this.flushBufferToDisk();
  }

  info(message: string, extra?: any) { this.log('INFO', message, extra); }
  warn(message: string, extra?: any) { this.log('WARN', message, extra); }
  error(message: string, extra?: any) { this.log('ERROR', message, extra); }

  /**
   * The Background Worker
   * Pulls all logs out of the queue and writes them to the physical file
   * in one rapid batch. Protected against overlapping write errors.
   */
  private async flushBufferToDisk() {
    // If the disk head is already busy writing, let the queue build up.
    if (this.isWriting || this.logQueue.length === 0) return;
    
    this.isWriting = true;

    try {
      // 1. Grab everything in the queue in one gulp
      const batch = this.logQueue.join('');
      this.logQueue = []; // Clear the queue instantly

      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE);
      
      // 2. Auto-rotate cleanup
      if (fileInfo.exists && fileInfo.size > MAX_LOG_SIZE) {
         await FileSystem.writeAsStringAsync(LOG_FILE, '--- LOG ROTATED (MAX SIZE REACHED) ---\n');
      }

      // 3. Disk IO Phase
      if (!fileInfo.exists || (fileInfo.exists && fileInfo.size > MAX_LOG_SIZE)) {
        await FileSystem.writeAsStringAsync(LOG_FILE, batch);
      } else {
        // Read & Append Batch (Done safely outside of Saga transactions!)
        const currentContent = await FileSystem.readAsStringAsync(LOG_FILE);
        await FileSystem.writeAsStringAsync(LOG_FILE, currentContent + batch);
      }
    } catch (e) {
      console.error('[AsyncLogger] Disk Flush Failed. Logs may be lost.', e);
    } finally {
      this.isWriting = false;
      
      // If more logs showed up while we were writing, drain the queue again!
      if (this.logQueue.length > 0) {
        this.flushBufferToDisk();
      }
    }
  }

  /**
   * Used by the DbDebugFab to show logs in the UI
   */
  async getLogs(): Promise<string> {
    try {
      // Make sure we write any pending memory logs before showing the screen!
      if (this.logQueue.length > 0) {
        await this.flushBufferToDisk();
      }

      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE);
      if (!fileInfo.exists) return '--- NO LOGS FOUND ---';
      return await FileSystem.readAsStringAsync(LOG_FILE);
    } catch {
      return '--- ERROR READING LOGS ---';
    }
  }

  /**
   * Clears the persistent log file
   */
  async clear() {
    try {
      await FileSystem.deleteAsync(LOG_FILE, { idempotent: true });
      this.logQueue = [];
      console.log('[AsyncLogger] Persistent logs cleared.');
    } catch (e) {
      console.error('[AsyncLogger] Failed to clear logs', e);
    }
  }
}

export const Logger = new AsyncLogger();
