import * as FileSystem from 'expo-file-system/legacy';

/**
 * LOG DIRECTORY:
 * Uses a dedicated subdirectory for daily rotating JS-layer logs.
 * These complement the native LogcatRecorder's system-level logs.
 */
const LOG_DIR = `${FileSystem.documentDirectory}commit-logs/`;

/**
 * Returns today's log filename in YYYY-MM-DD format.
 */
function getTodayFileName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `commit-js-${y}-${m}-${d}.log`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRO-GRADE ASYNC LOGGER (The "Black Box Flight Recorder" — JS Layer)
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * ARCHITECTURE (Post-Upgrade):
 *   This logger now works in tandem with the native LogcatRecorder module:
 * 
 *   ┌─────────────────┐   ┌──────────────────────┐
 *   │  JS Logger       │   │  Native LogcatRecorder│
 *   │  (this file)     │   │  (logcat-module)      │
 *   ├─────────────────┤   ├──────────────────────┤
 *   │ Structured logs  │   │ RAW system logcat     │
 *   │ with caller info │   │ (ALL native + JS)     │
 *   │ + JSON data      │   │                       │
 *   ├─────────────────┤   ├──────────────────────┤
 *   │ commit-js-*.log  │   │ commit-logcat-*.log   │
 *   │ (daily rotation) │   │ (daily rotation)      │
 *   └─────────────────┘   └──────────────────────┘
 * 
 * CHANGES FROM v1:
 *   1. REMOVED the 500KB auto-rotation cap. Logs grow until YOU clear them.
 *   2. DAILY FILE ROTATION: One file per day (commit-js-2026-04-26.log).
 *      This keeps individual files small enough that the read+append
 *      pattern doesn't cause OOM on large files.
 *   3. MANUAL CLEAR ONLY: Logs persist across app kills and phone restarts.
 *      Only Logger.clear() or Logger.clearAll() wipes them.
 *   4. AUTO-TRACING preserved: Caller file + line number auto-detected.
 * ─────────────────────────────────────────────────────────────────────────────
 */
class AsyncLogger {
  private logQueue: string[] = [];
  private isWriting = false;
  private dirEnsured = false;

  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  /**
   * Hijacks global console calls to ensure they are recorded in the persistent log files.
   * This is critical for Release builds where standard console logs are often hidden.
   */
  installPolyfill() {
    if ((global as any)._commitLoggerPolyfilled) return;

    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.log('INFO', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.log('WARN', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.log('ERROR', args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    (global as any)._commitLoggerPolyfilled = true;
    this.info('Global Console Polyfill Activated. All console.logs are now being recorded.');
  }

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
   * Ensures the log directory exists. Called once lazily.
   */
  private async ensureDirectory() {
    if (this.dirEnsured) return;
    try {
      const info = await FileSystem.getInfoAsync(LOG_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
      }
      this.dirEnsured = true;
    } catch (e) {
      console.error('[AsyncLogger] Failed to create log directory:', e);
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

    // 1. Console Output for Dev Mode (using original to avoid recursion)
    if (level === 'ERROR') this.originalConsole.error(`[${caller}] ${message}`, extra || '');
    else if (level === 'WARN') this.originalConsole.warn(`[${caller}] ${message}`, extra || '');
    else this.originalConsole.log(`[${caller}] ${message}`, extra || '');

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
      await this.ensureDirectory();

      // 1. Grab everything in the queue in one gulp
      const batch = this.logQueue.join('');
      this.logQueue = []; // Clear the queue instantly

      // 2. Write to today's daily log file (APPEND mode)
      const logFile = LOG_DIR + getTodayFileName();
      const fileInfo = await FileSystem.getInfoAsync(logFile);
      
      if (!fileInfo.exists) {
        // New day, new file — write the batch as the first content
        await FileSystem.writeAsStringAsync(logFile, batch);
      } else {
        // Append to existing today's file
        // NOTE: expo-file-system doesn't have native append, so we read+write.
        // This is safe because daily files stay small (JS logs are ~1-5MB/day max).
        const currentContent = await FileSystem.readAsStringAsync(logFile);
        await FileSystem.writeAsStringAsync(logFile, currentContent + batch);
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
   * Returns today's logs (JS-layer structured logs).
   * Used by the DbDebugFab to show logs in the UI.
   */
  async getLogs(): Promise<string> {
    try {
      // Make sure we write any pending memory logs before showing the screen!
      if (this.logQueue.length > 0) {
        await this.flushBufferToDisk();
      }

      const logFile = LOG_DIR + getTodayFileName();
      const fileInfo = await FileSystem.getInfoAsync(logFile);
      if (!fileInfo.exists) return '--- NO LOGS FOR TODAY ---';
      return await FileSystem.readAsStringAsync(logFile);
    } catch {
      return '--- ERROR READING LOGS ---';
    }
  }

  /**
   * Returns a list of all JS log files with their sizes.
   * Enables the UI to show a "Log History" with daily entries.
   */
  async getLogIndex(): Promise<{ name: string; size: number }[]> {
    try {
      await this.ensureDirectory();
      const files = await FileSystem.readDirectoryAsync(LOG_DIR);
      const index: { name: string; size: number }[] = [];

      for (const file of files) {
        if (file.startsWith('commit-js-')) {
          const info = await FileSystem.getInfoAsync(LOG_DIR + file);
          if (info.exists) {
            index.push({ name: file, size: (info as any).size || 0 });
          }
        }
      }

      return index.sort((a, b) => b.name.localeCompare(a.name)); // newest first
    } catch {
      return [];
    }
  }

  /**
   * Clears today's log file only.
   */
  async clear() {
    try {
      const logFile = LOG_DIR + getTodayFileName();
      await FileSystem.deleteAsync(logFile, { idempotent: true });
      this.logQueue = [];
      console.log('[AsyncLogger] Today\'s logs cleared.');
    } catch (e) {
      console.error('[AsyncLogger] Failed to clear logs', e);
    }
  }

  /**
   * Clears ALL persistent JS log files across all days.
   * This is the nuclear option — use only when the user explicitly requests it.
   */
  async clearAll() {
    try {
      await FileSystem.deleteAsync(LOG_DIR, { idempotent: true });
      this.logQueue = [];
      this.dirEnsured = false;
      console.log('[AsyncLogger] ALL persistent logs cleared.');
    } catch (e) {
      console.error('[AsyncLogger] Failed to clear all logs', e);
    }
  }
}

export const Logger = new AsyncLogger();
