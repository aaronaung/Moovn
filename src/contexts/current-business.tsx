import { Tables } from "@/types/db.extension";
import { createContext, useContext } from "react";
import { useLocalStorage } from "usehooks-ts";

type CurrentBusinessContextValue = {
  currentBusiness: Tables<"businesses">;
  setCurrentBusiness: (business: Tables<"businesses">) => void;
};

const CurrentBusinessContext =
  createContext<CurrentBusinessContextValue | null>(null);
function useCurrentBusinessContext() {
  const context = useContext(CurrentBusinessContext);
  if (!context) {
    throw new Error(
      `useCurrentBusinessContext must be used within a CurrentBusinessProvider`,
    );
  }
  return context;
}

function CurrentBusinessProvider({
  initialBusinesses,
  ...props
}: {
  initialBusinesses: Tables<"businesses">[];
  children: React.ReactNode;
}) {
  const [business, setBusiness] = useLocalStorage(
    "current_business",
    initialBusinesses.length > 0
      ? initialBusinesses[0]
      : ({} as Tables<"businesses">),
  );

  const setCurrentBusiness = (business: Tables<"businesses">) => {
    setBusiness(business);
  };

  const value = {
    currentBusiness: business,
    setCurrentBusiness,
  };

  return <CurrentBusinessContext.Provider value={value} {...props} />;
}

export { CurrentBusinessProvider, useCurrentBusinessContext };
export default CurrentBusinessContext;
