import { SQLiteDatabase } from 'expo-sqlite';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Triple-Write Transactional Orchestrator                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  Ensures atomic consistency across a distributed environment:                ║
 * ║  Cloud (Convex) -> Local Cache (SQLite) -> Hardware (Kotlin).                ║
 * ║                                                                              ║
 * ║  CAPABILITY:                                                                 ║
 * ║  Implements a Compensating Transaction (Saga) Pattern. If a later step       ║
 * ║  fails, it explicitly "Undoes" previous cloud/disk commits to prevent        ║
 * ║  Security Drift (Commitments that are locked in cloud but not enforced).     ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export interface TransactionStep<TContext, TResult> {
  name: string;
  // Execute receives the frozen context snapshot, plus any data returned from previous steps
  execute: (context: TContext, previousResults: Record<string, any>) => Promise<TResult>;
  // Compensate is guaranteed to receive the rigid context, the previous results, and ITS OWN result
  compensate?: (context: TContext, result: TResult, previousResults: Record<string, any>) => Promise<void>;
}

export class TripleWriteOrchestrator<TContext> {
  private steps: TransactionStep<TContext, any>[] = [];
  private contextSnapshot: TContext;

  /**
   * @param initialContext - The rigid "Snapshot of Intent". We deeply clone it
   * to ensure no subsequent UI state mutations can physically corrupt the rollback logic.
   */
  constructor(initialContext: TContext) {
    this.contextSnapshot = JSON.parse(JSON.stringify(initialContext));
  }

  /**
   * Adds a step to the orchestration chain.
   * 
   * @param name - Human readable step name for logging (also used as the key for previousResults).
   * @param execute - The primary logic for this layer.
   * @param compensate - (Optional) Logic to REVERT this step if a LATER step fails.
   */
  addStep<TResult>(
    name: string,
    execute: (context: TContext, previousResults: Record<string, any>) => Promise<TResult>,
    compensate?: (context: TContext, result: TResult, previousResults: Record<string, any>) => Promise<void>
  ) {
    this.steps.push({ name, execute, compensate });
    return this;
  }

  /**
   * Executes the entire chain with automatic rollback on failure.
   * @returns `rollbackFailed: true` if the internet cuts out DURING the undo sequence, signaling upstream to trigger Hydration.
   */
  async execute(): Promise<{ success: boolean; error: string | null; results: Record<string, any>; rollbackFailed: boolean }> {
    const completedSteps: { step: TransactionStep<TContext, any>; result: any }[] = [];
    const stepResults: Record<string, any> = {};

    console.log(`[TripleWrite] Initiating ${this.steps.length}-stage transaction sequence...`);

    try {
      for (const step of this.steps) {
        console.log(`[TripleWrite] Executing Phase: ${step.name}...`);
        
        // Feed the snapshot and previous results forward
        const result = await step.execute(this.contextSnapshot, stepResults);
        
        stepResults[step.name] = result;
        completedSteps.push({ step, result });
      }

      console.log(`[TripleWrite] SUCCESS: All layers committed exactly to intent.`);
      return { success: true, error: null, results: stepResults, rollbackFailed: false };

    } catch (error: any) {
      console.error(`[TripleWrite] FAILURE at step "${this.steps[completedSteps.length]?.name || 'unknown'}":`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      let requiresHydrationReconciliation = false;

      // --- COMPENSATING TRANSACTION LOGIC (PHASED ROLLBACK) ---
      console.warn(`[TripleWrite] CRITICAL: Initiating Compensating Rollback sequence...`);
      
      // We iterate BACKWARDS through successfully completed steps to undo them
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const { step, result } = completedSteps[i];
        if (step.compensate) {
          try {
            console.warn(`[TripleWrite] Rollback: Reverting ${step.name}...`);
            // The rollback logic receives the pure original intent so it knows exactly what to undo
            await step.compensate(this.contextSnapshot, result, stepResults);
            console.log(`[TripleWrite] Rollback: ${step.name} reverted successfully.`);
          } catch (compensateError) {
            // [Amnesia Guard / Reconciliation Trigger]: 
            // If the rollback itself fails (e.g., internet drops), we MUST notify the caller
            // so they can instantly trigger a background Hydration Sync to clean the drift.
            requiresHydrationReconciliation = true;
            console.error(`[TripleWrite] CATASTROPHIC ROLLBACK FAILURE for ${step.name}:`, compensateError);
          }
        }
      }

      return { 
        success: false, 
        error: errorMessage, 
        results: stepResults, 
        rollbackFailed: requiresHydrationReconciliation 
      };
    }
  }
}

