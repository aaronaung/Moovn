"use client";

import { AuthContextProvider } from "../contexts/auth";

export default function AuthProvider({
  children,
  redirectOnUnauthed,
}: {
  children: any;
  redirectOnUnauthed?: boolean;
}) {
  return (
    <AuthContextProvider redirectOnUnauthed={redirectOnUnauthed}>
      {children}
    </AuthContextProvider>
  );
}
