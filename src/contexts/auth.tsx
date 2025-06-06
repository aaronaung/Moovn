import { createContext, useContext, useEffect, useState } from "react";

import { AuthChangeEvent, AuthSession, Session } from "@supabase/supabase-js";
import { supaClientComponentClient } from "../data/clients/browser";
import { toDbUser } from "../data/users";
import { Tables } from "@/types/db";

export const TEMP_SESSION_KEY = "sb-temp-session";

export const AuthContext = createContext<{
  user: Tables<"users"> | null;
  session: Session | null;
}>({
  user: null,
  session: null,
});

export const AuthContextProvider = (props: {
  children: React.ReactNode;
  redirectOnUnauthed?: boolean;
}) => {
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Tables<"users"> | null>(null);

  const supabase = supaClientComponentClient;

  const redirectToLoginIfUnauthed = (
    session: Session | null,
    event?: AuthChangeEvent,
  ) => {
    const returnPath = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    );
    if (
      (event && event === "SIGNED_OUT") ||
      (!session?.user && !window.location.href.includes("/sign-in"))
    ) {
      window.location.href = `/sign-in?return_path=${returnPath}`;
    }
  };

  const restoreSessionInLocalStorage = async () => {
    const savedSession = localStorage.getItem(TEMP_SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      await supaClientComponentClient.auth.setSession(parsed);
      localStorage.removeItem(TEMP_SESSION_KEY);
      return parsed;
    }
    return null;
  };

  const handleUserAuthChange = async (
    session: AuthSession | null,
    event?: AuthChangeEvent,
  ) => {
    const localStorageSession = await restoreSessionInLocalStorage();

    // Having localStorageSession means that there is a temporary session saved in localStorage that can be restored, so we don't need to redirect to login.
    if (props.redirectOnUnauthed && !localStorageSession) {
      redirectToLoginIfUnauthed(session, event);
    }

    const dbUser = await toDbUser(session?.user, { client: supabase });
    setUserSession(session);
    setUser(dbUser);
  };

  useEffect(() => {
    // Initialize user on mount.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setTimeout(() => {
        // We have to use setTimeout here to avoid deadlock. See the "important"
        // section here: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
        handleUserAuthChange(session, undefined);
      }, 0);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => {
          handleUserAuthChange(session, event);
        }, 0);
      },
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session: userSession,
    user,
  };
  return <AuthContext.Provider value={value} {...props} />;
};

export const useAuthUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a AuthContextProvider.");
  }

  return context;
};
