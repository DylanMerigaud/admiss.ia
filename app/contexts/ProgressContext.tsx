"use client";

import React, { createContext, useContext } from "react";

interface SkillProgress {
  [key: string]: {
    level: number;
    status: "locked" | "available" | "in-progress" | "completed" | "mastered";
    timeSpent: number;
    lastAccessed: Date | null;
  };
}

interface ProgressContextType {
  skillProgress: SkillProgress;
  updateProgress: (skillId: string, progress: number) => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
};

export const ProgressProvider: React.FC<{
  value: ProgressContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
