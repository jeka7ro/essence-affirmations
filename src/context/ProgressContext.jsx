import React, { createContext, useContext, useMemo, useState } from "react";

const ProgressContext = createContext({
  progress: null,
  setProgress: () => {}
});

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(null);

  const value = useMemo(() => ({ progress, setProgress }), [progress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  return useContext(ProgressContext);
}
