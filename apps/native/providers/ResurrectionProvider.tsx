import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Logger } from '@/lib/logger';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TYPE DEFINITIONS
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface ResurrectionContextType {
  /** The current lifecycle iteration of the application data layer. */
  iteration: number;
  /** Triggers a 'Soft Reset' by incrementing the iteration, forcing dependencies to rebuild. */
  resurrect: () => void;
}

const ResurrectionContext = createContext<ResurrectionContextType | undefined>(undefined);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVIDER COMPONENT: ResurrectionProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * This provider manages the 'Rebirth Engine' state. It allows any child component
 * to trigger a system-wide re-instantiation of the data layer (the Convex client)
 * to resolve 'Zombie' connections or persistent state corruption.
 */
export const ResurrectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [iteration, setIteration] = useState(0);

  /**
   * Triggers a system-wide resurrection.
   * Increments the iteration counter, which forces useMemo-wrapped clients to rebuild.
   */
  const resurrect = useCallback(() => {
    Logger.info(`[Resurrection] System reset triggered. Moving to Iteration: ${iteration + 1}`);
    setIteration((prev) => prev + 1);
  }, [iteration]);

  const value = useMemo(() => ({
    iteration,
    resurrect,
  }), [iteration, resurrect]);

  return (
    <ResurrectionContext.Provider value={value}>
      {children}
    </ResurrectionContext.Provider>
  );
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOOK: useResurrection
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook to access the resurrection state and trigger a system reset.
 * 
 * @throws Error if used outside of a ResurrectionProvider.
 */
export const useResurrection = (): ResurrectionContextType => {
  const context = useContext(ResurrectionContext);
  if (context === undefined) {
    throw new Error('useResurrection must be used within a ResurrectionProvider');
  }
  return context;
};
