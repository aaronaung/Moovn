"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getAuthUser } from "@/src/data/users";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Tables } from "@/types/db";

interface AccessControlProps {
  allowedUserTypes: Array<Tables<"users">["type"]>;
  children: React.ReactNode;
  redirectTo?: string;
}

export function AccessControl({
  allowedUserTypes,
  children,
  redirectTo = "/app/profile",
}: AccessControlProps) {
  const { data: user, isLoading } = useSupaQuery(getAuthUser, { queryKey: ["getAuthUser"] });
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedUserTypes.includes(user.type)) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, allowedUserTypes, router, redirectTo]);

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  if (!user || !allowedUserTypes.includes(user.type)) {
    return <Spinner className="mt-8" />;
  }

  return <>{children}</>;
}

// Route-based access control configuration
const ROUTE_ACCESS_CONTROL: Record<string, Array<Tables<"users">["type"]>> = {
  "/app/sources": ["studio"],
  "/app/instructors": ["studio"],
  "/app/my-studios": ["instructor"],
  "/app/profile": ["studio", "instructor"], // Available to all user types
  // Add other routes as needed
  "/app/templates": ["studio"], // Assuming templates are studio-only
  "/app/destinations": ["studio"], // Assuming destinations are studio-only
  "/app/calendar": ["studio"], // Assuming calendar is studio-only
};

export function useRouteAccessControl() {
  const { data: user, isLoading } = useSupaQuery(getAuthUser, { queryKey: ["getAuthUser"] });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user || !pathname) return;

    // Find the most specific route match
    const matchingRoute = Object.keys(ROUTE_ACCESS_CONTROL)
      .filter((route) => pathname.startsWith(route))
      .sort((a, b) => b.length - a.length)[0]; // Get the longest match (most specific)

    if (matchingRoute) {
      const allowedTypes = ROUTE_ACCESS_CONTROL[matchingRoute];
      if (!allowedTypes.includes(user.type)) {
        // Redirect to appropriate page based on user type
        const redirectTo = user.type === "studio" ? "/app/sources" : "/app/my-studios";
        router.replace(redirectTo);
      }
    }
  }, [user, isLoading, pathname, router]);

  return { user, isLoading };
}
