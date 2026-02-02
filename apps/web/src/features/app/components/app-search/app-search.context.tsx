import { createContext, useContext, useState, type ReactNode } from "react";

interface AppSearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AppSearchContext = createContext<AppSearchContextValue | null>(null);

export const AppSearchProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <AppSearchContext.Provider value={{ open, setOpen }}>
      {children}
    </AppSearchContext.Provider>
  );
};

export const useAppSearch = () => {
  const context = useContext(AppSearchContext);
  if (!context) {
    throw new Error("useAppSearch must be used within an AppSearchProvider");
  }
  return context;
};
