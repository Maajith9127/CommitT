import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

interface TabContextType {
  // Track which tabs have been visited
  visitedTabs: Set<string>;
  markTabVisited: (tabId: string) => void;
  
  // Tab state management
  tabStates: Map<string, any>;
  saveTabState: (tabId: string, state: any) => void;
  getTabState: (tabId: string) => any;
  clearTabState: (tabId: string) => void;
  
  // Performance optimizations
  isTabReady: boolean;
  shouldPreload: (tabId: string) => boolean;
  
  // Analytics
  tabSwitchCount: number;
  lastActiveTab: string | null;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['commits']));
  const [tabStates, setTabStates] = useState<Map<string, any>>(new Map());
  const [isTabReady, setIsTabReady] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [lastActiveTab, setLastActiveTab] = useState<string | null>('commits');

  // Initialize tab system
  useEffect(() => {
    // Load persisted tab states from storage
    const loadTabStates = async () => {
      try {
        // Load from AsyncStorage or similar if needed
        // For now, just simulate readiness
        setTimeout(() => setIsTabReady(true), 100);
      } catch (error) {
        console.error('Failed to load tab states:', error);
        setIsTabReady(true);
      }
    };
    
    loadTabStates();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // Here we could persist state to AsyncStorage
      }
    });

    return () => subscription.remove();
  }, []);

  const markTabVisited = useCallback((tabId: string) => {
    setVisitedTabs(prev => {
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
    
    // Track tab switching for analytics/optimizations
    setTabSwitchCount(prev => prev + 1);
    setLastActiveTab(tabId);
  }, []);

  const saveTabState = useCallback((tabId: string, state: any) => {
    setTabStates(prev => {
      const next = new Map(prev);
      next.set(tabId, {
        ...state,
        timestamp: Date.now(),
      });
      return next;
    });
  }, []);

  const getTabState = useCallback((tabId: string) => {
    const state = tabStates.get(tabId);
    // Clear old states (older than 24 hours) - simplified logic
    if (state && Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      clearTabState(tabId);
      return null;
    }
    return state;
  }, [tabStates]);

  const clearTabState = useCallback((tabId: string) => {
    setTabStates(prev => {
      const next = new Map(prev);
      next.delete(tabId);
      return next;
    });
  }, []);

  const shouldPreload = useCallback((tabId: string) => {
    // Preload tabs that are frequently visited or are main tabs
    return visitedTabs.has(tabId) || 
           ['commits', 'schedules'].includes(tabId);
  }, [visitedTabs]);

  const value = {
    visitedTabs,
    markTabVisited,
    tabStates,
    saveTabState,
    getTabState,
    clearTabState,
    isTabReady,
    shouldPreload,
    tabSwitchCount,
    lastActiveTab,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabContext must be used within TabProvider');
  }
  return context;
};
