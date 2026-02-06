export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : "");
  },
  error: (code: string, data?: unknown) => {
    console.error(`[ERROR] ${code}`, data ? JSON.stringify(data) : "");
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : "");
  },
  debug: (message: string, data?: unknown) => {
    // In production we might want to suppress this or check an env var
    console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data) : "");
  },
};
