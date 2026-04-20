import { useHydrationSync } from "@/hooks/useHydrationSync";

/** 
 * Invisible background Sync Engine.
 * Sits actively at the absolute root of the UI, monitoring authentication
 * and dispatching the Silent Fetch to rebuild SQLite when missing.
 */
export function HydrationEngine() {
  useHydrationSync(); // Runs invisibly, pushing to SQLite & Kotlin securely on the backend thread!
  // In the future: We can add an 'isSyncing' full-screen blur here if we detect 
  // a complete Amnesia wipe, to strictly gate the user out!
  return null; 
}
