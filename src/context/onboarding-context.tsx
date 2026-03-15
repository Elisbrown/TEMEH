
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'temeh_onboarding_completed';

type OnboardingContextType = {
  completedPages: string[];
  shouldShowOnboarding: (pageKey: string) => boolean;
  completeOnboarding: (pageKey: string) => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [completedPages, setCompletedPages] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const completeOnboarding = useCallback((pageKey: string) => {
    setCompletedPages((prev) => {
      if (prev.includes(pageKey)) {
        return prev;
      }
      const newCompleted = [...prev, pageKey];
      if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(newCompleted));
      }
      return newCompleted;
    });
  }, []);

  const shouldShowOnboarding = useCallback((pageKey: string) => {
    return !completedPages.includes(pageKey);
  }, [completedPages]);

  return (
    <OnboardingContext.Provider value={{ completedPages, shouldShowOnboarding, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
