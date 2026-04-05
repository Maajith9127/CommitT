import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILE = `${FileSystem.documentDirectory}commit-t-debug.log`;
const MAX_LOG_SIZE = 500 * 1024; // 500KB - prevents the file from eating storage

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROD-LEVEL PERSISTENT LOGGER
 * ─────────────────────────────────────────────────────────────────────────────
 * Writes logs to a persistent text file on the phone's storage.
 * Essential for diagnosing "Ghost Errors" that happen while the app is in
 * the background or after a crash.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const Logger = {
  /**
   * Appends a log entry to the persistent file
   */
  async log(level: 'INFO' | 'WARN' | 'ERROR', message: string, extra?: any) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level}] ${message} ${extra ? JSON.stringify(extra) : ''}\n`;

    // 1. Console log for real-time visibility
    if (level === 'ERROR') console.error(message, extra);
    else if (level === 'WARN') console.warn(message, extra);
    else console.log(message, extra);

    try {
      // 2. Append to file
      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE);
      
      // Auto-rotate: if file is too big, clear it to start fresh
      if (fileInfo.exists && fileInfo.size > MAX_LOG_SIZE) {
        await FileSystem.writeAsStringAsync(LOG_FILE, '--- LOG ROTATED (MAX SIZE REACHED) ---\n');
      }

      if (!fileInfo.exists) {
        await FileSystem.writeAsStringAsync(LOG_FILE, entry);
      } else {
        const currentContent = await FileSystem.readAsStringAsync(LOG_FILE);
        await FileSystem.writeAsStringAsync(LOG_FILE, currentContent + entry);
      }
    } catch (e) {
      console.error('[Logger] Failed to write to log file', e);
    }
  },

  info(msg: string, extra?: any) { this.log('INFO', msg, extra); },
  warn(msg: string, extra?: any) { this.log('WARN', msg, extra); },
  error(msg: string, extra?: any) { this.log('ERROR', msg, extra); },

  /**
   * Reads the entire log file (for viewing in the UI)
   */
  async getLogs(): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(LOG_FILE);
      if (!fileInfo.exists) return '--- NO LOGS FOUND ---';
      return await FileSystem.readAsStringAsync(LOG_FILE);
    } catch {
      return '--- ERROR READING LOGS ---';
    }
  },

  /**
   * Clears the log file
   */
  async clear() {
    try {
      await FileSystem.deleteAsync(LOG_FILE, { idempotent: true });
      console.log('[Logger] Persistent logs cleared.');
    } catch (e) {
      console.error('[Logger] Failed to clear logs', e);
    }
  }
};
