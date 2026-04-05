import { Logger } from './logger';

export interface TransactionStep<TContext, TResult> {
  name: string;
  execute: (context: TContext, previousResults: Record<string, any>) => Promise<TResult>;
  compensate?: (context: TContext, result: TResult, previousResults: Record<string, any>) => Promise<void>;
}

export class TripleWriteOrchestrator<TContext> {
  private steps: TransactionStep<TContext, any>[] = [];
  private contextSnapshot: TContext;
  private sagaId: string;

  constructor(initialContext: TContext) {
    this.contextSnapshot = JSON.parse(JSON.stringify(initialContext));
    // Generate a short ID for this specific transaction to track it in logs
    this.sagaId = Math.random().toString(36).substring(7).toUpperCase();
  }

  addStep<TResult>(
    name: string,
    execute: (context: TContext, previousResults: Record<string, any>) => Promise<TResult>,
    compensate?: (context: TContext, result: TResult, previousResults: Record<string, any>) => Promise<void>
  ) {
    this.steps.push({ name, execute, compensate });
    return this;
  }

  async execute(): Promise<{ success: boolean; error: string | null; results: Record<string, any>; rollbackFailed: boolean }> {
    const completedSteps: { step: TransactionStep<TContext, any>; result: any }[] = [];
    const stepResults: Record<string, any> = {};

    Logger.info(`[Saga:${this.sagaId}] Initiating ${this.steps.length}-stage sequence...`, { context: this.contextSnapshot });

    try {
      for (const step of this.steps) {
        Logger.info(`[Saga:${this.sagaId}] Phase: ${step.name}`);
        const result = await step.execute(this.contextSnapshot, stepResults);
        stepResults[step.name] = result;
        completedSteps.push({ step, result });
      }

      Logger.info(`[Saga:${this.sagaId}] SUCCESS: All layers committed.`);
      return { success: true, error: null, results: stepResults, rollbackFailed: false };

    } catch (error: any) {
      Logger.error(`[Saga:${this.sagaId}] FAILURE at phase "${this.steps[completedSteps.length]?.name || 'unknown'}":`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      let requiresHydrationReconciliation = false;

      Logger.warn(`[Saga:${this.sagaId}] ROLLBACK: Reverting completed phases...`);
      
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const { step, result } = completedSteps[i];
        if (step.compensate) {
          try {
            Logger.warn(`[Saga:${this.sagaId}] Reverting ${step.name}...`);
            await step.compensate(this.contextSnapshot, result, stepResults);
          } catch (compensateError) {
            requiresHydrationReconciliation = true;
            Logger.error(`[Saga:${this.sagaId}] CATASTROPHIC ROLLBACK FAILURE for ${step.name}:`, compensateError);
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

