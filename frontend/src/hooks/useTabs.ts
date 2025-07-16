// src/hooks/useTabs.ts
import { useState, useCallback } from 'react';

export type TabValue = string;

interface UseTabsProps {
  defaultValue?: TabValue;
  value?: TabValue;
  onValueChange?: (value: TabValue) => void;
}

interface UseTabsReturn {
  activeTab: TabValue;
  setActiveTab: (value: TabValue) => void;
  isActive: (value: TabValue) => boolean;
}

export const useTabs = ({
  defaultValue = '',
  value,
  onValueChange,
}: UseTabsProps = {}): UseTabsReturn => {
  const [internalValue, setInternalValue] = useState<TabValue>(defaultValue);
  
  // Use controlled value if provided, otherwise use internal state
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = useCallback((newValue: TabValue) => {
    if (value === undefined) {
      // Uncontrolled mode
      setInternalValue(newValue);
    }
    // Call the callback regardless of controlled/uncontrolled mode
    onValueChange?.(newValue);
  }, [value, onValueChange]);

  const isActive = useCallback((tabValue: TabValue) => {
    return activeTab === tabValue;
  }, [activeTab]);

  return {
    activeTab,
    setActiveTab,
    isActive,
  };
};