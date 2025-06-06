"use client";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { getAppSidebarNavigation } from "../navigation";
import { cn } from "@/src/utils";
import { useState } from "react";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { Header2 } from "@/src/components/common/header";
import { userDisplayName } from "@/src/libs/user";
import { ModeToggle } from "@/src/components/common/mode-toggle";
import { MoovnLogo, MoovnIcon2 } from "@/src/components/ui/icons/moovn";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getAuthUser } from "@/src/data/users";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";

export const COLLAPSED_WIDTH = 70;
export const EXPANDED_WIDTH = 200;

const getUserInitials = (user: any) => {
  if (user?.first_name && user?.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  if (user?.email) {
    return user.email[0].toUpperCase();
  }
  return "U";
};

export default function Dashboard({ children, className }: { children: any; className?: string }) {
  const { data: user, isLoading } = useSupaQuery(getAuthUser, { queryKey: ["getAuthUser"] });
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get role-based navigation
  const navigation = getAppSidebarNavigation(user || null);

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className={cn("grid h-screen w-full md:grid-cols-[auto_1fr]", className)}>
      {/* Desktop Sidebar */}
      <div
        className="z-20 hidden border-r bg-muted/40 transition-all duration-300 ease-in-out hover:w-[200px] md:block"
        style={{ width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="fixed flex h-full w-[inherit] flex-col gap-2">
          <div className="flex h-14 items-center justify-between px-4 lg:h-[60px]">
            <Logo isExpanded={isExpanded} />
            <div className={cn("transition-opacity", isExpanded ? "opacity-100" : "opacity-0")}>
              <ModeToggle />
            </div>
          </div>

          <div className="flex-1">
            <nav className="flex h-full flex-col items-start space-y-1 px-2 pb-8 text-sm font-medium">
              {navigation.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "relative flex h-10 w-full items-center rounded-lg transition-all hover:bg-muted hover:text-primary",
                    pathname?.startsWith(n.href) && "bg-muted text-primary",
                  )}
                >
                  <div
                    className={cn(
                      "absolute flex h-full items-center transition-all duration-300",
                      "left-4",
                    )}
                  >
                    <n.icon className="h-6 w-6 shrink-0" />
                  </div>
                  <span
                    className={cn(
                      "absolute left-14 whitespace-nowrap transition-all duration-200",
                      isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                  >
                    {n.name}
                  </span>
                </Link>
              ))}
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "relative flex h-10 w-full cursor-pointer items-center rounded-lg transition-all hover:bg-muted hover:text-primary",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute left-4 flex h-full items-center transition-all duration-300",
                      )}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.avatar_url || undefined} alt="Profile" />
                        <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <span
                      className={cn(
                        "absolute left-14 whitespace-nowrap transition-all duration-200",
                        isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
                      )}
                    >
                      Profile
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {user && (
                    <div className="p-2">
                      <Header2 title="Welcome" />
                      <p className="text-sm text-muted-foreground">{userDisplayName(user)}</p>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/app/profile">Profile Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supaClientComponentClient.auth.signOut();
                      router.push("/sign-in");
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex w-full flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center border-b bg-muted px-4 md:hidden lg:h-[60px]">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <div className="flex h-14 items-center border-b px-4">
                <Logo isExpanded={true} />
              </div>
              <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-muted hover:text-primary",
                      pathname?.startsWith(n.href) && "bg-muted text-primary",
                    )}
                  >
                    <n.icon className="h-6 w-6" />
                    {n.name}
                  </Link>
                ))}
              </nav>
              <div className="border-t p-4">
                <p className="text-sm text-muted-foreground">
                  For support, email us at{" "}
                  <a className="hover:text-primary hover:underline" href="mailto:team@moovn.co">
                    team@moovn.co
                  </a>
                </p>
              </div>
            </SheetContent>
          </Sheet>
          <Logo isExpanded={true} />
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="text-sm">{getUserInitials(user)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user && (
                  <div className="p-2">
                    <Header2 title="Welcome" />
                    <p className="text-sm text-muted-foreground">{userDisplayName(user)}</p>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supaClientComponentClient.auth.signOut();
                    router.push("/sign-in");
                  }}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col sm:h-[calc(100vh-80px)]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Logo({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className={cn("flex items-center")}>
      <Link href="/" className={cn("flex h-8 items-center pl-4 md:pl-0")}>
        <div className="relative h-8 w-[120px]">
          <div
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 transition-opacity duration-200",
              isExpanded ? "opacity-100" : "opacity-0",
            )}
          >
            <MoovnLogo className="h-8" />
          </div>
          <div
            className={cn(
              "absolute -left-3 top-1/2 -translate-y-1/2 transition-opacity duration-200",
              isExpanded ? "opacity-0" : "opacity-100",
            )}
          >
            <MoovnIcon2 className="h-5" />
          </div>
        </div>
      </Link>
    </div>
  );
}
