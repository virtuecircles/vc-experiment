import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface GlobalLoadingContextValue {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export const useGlobalLoading = () => useContext(GlobalLoadingContext);

export const GlobalLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const startLoading = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ isLoading: count > 0, startLoading, stopLoading }}>
      {children}
    </GlobalLoadingContext.Provider>
  );
};
