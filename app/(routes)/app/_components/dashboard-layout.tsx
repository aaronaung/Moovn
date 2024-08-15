"use client";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/src/components/ui/sheet";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { appSidebarNavigation } from "../navigation";
import { cn } from "@/src/utils";
import { useState } from "react";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { Header2 } from "@/src/components/common/header";
import { userDisplayName } from "@/src/libs/user";
import { ModeToggle } from "@/src/components/common/mode-toggle";
import { MoovnLogo } from "@/src/components/ui/icons/moovn";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getAuthUser } from "@/src/data/users";
import { Spinner } from "@/src/components/common/loading-spinner";

export const SIDEBAR_WIDTH = 200;

export default function Dashboard({ children, className }: { children: any; className?: string }) {
  // const { data: currentSubscription, isLoading: isLoadingSubscription } =
  //   useSupaQuery(getStripeSubscriptionForBusiness, {
  //     queryKey: ["getStripeSubscriptionForBusiness"],
  //     arg: businesses[0]?.id,
  //   });
  // const currentPlan = derivePlanFromSubscription(currentSubscription);
  const { data: user, isLoading } = useSupaQuery(getAuthUser, { queryKey: ["getAuthUser"] });
  const path = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div
      className={cn(
        "grid h-screen w-full  md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr]",
        className,
      )}
    >
      <div className="z-20 hidden border-r bg-muted/40 md:block">
        <div className="fixed flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center gap-x-1.5 px-4 lg:h-[60px] lg:px-6">
            {/* <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button> */}
            <Logo />
            <ModeToggle />
          </div>

          <div className="flex-1">
            <nav className="flex h-full flex-col items-start px-2 text-sm font-medium md:gap-y-1 lg:px-4">
              {appSidebarNavigation.map((n) => {
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-4 py-2 transition-all hover:bg-muted hover:text-primary",
                      path.startsWith(n.href) && "bg-muted text-primary",
                    )}
                  >
                    <n.icon className="h-6 w-6" />
                    {n.name}
                  </Link>
                );
              })}
              <div className="flex-1"></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2 transition-all hover:bg-muted hover:text-primary",
                    )}
                  >
                    <UserCircleIcon className="h-7 w-7" />
                    Profile
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {user && (
                    <div className={"blocktext-sm cursor-pointer p-2 text-gray-700"}>
                      <Header2 title={"Welcome"} />
                      <p className="text-sm text-muted-foreground">{userDisplayName(user)}</p>
                    </div>
                  )}
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

          <div className="mt-auto p-4">
            {/* {currentApp === AppType.Instructor && (
              <Card x-chunk="dashboard-02-chunk-0">
                <CardHeader className="p-2 pt-0 md:p-4">
                  <CardTitle>Upgrade to Pro</CardTitle>
                  <CardDescription>
                    Unlock all features and get unlimited access to our support
                    team.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                  <Button size="sm" className="w-full rounded-full">
                    Upgrade
                  </Button>
                </CardContent>
              </Card>
            )} */}
          </div>
        </div>
      </div>
      <div className={"w-screen sm:w-full"}>
        <div className="z-20 flex h-14 w-fit items-center px-4 md:hidden">
          {/* {!isLoadingSubscription && (
            <div className="hidden gap-x-2 sm:flex ">
              <Badge className="rounded-sm bg-green-600 text-white">
                Active: {currentPlan} plan
              </Badge>
              {currentPlan !== SubscriptionPlan.Pro && (
                <Link href="/app/instructor/billing">
                  <Button className="h-6 text-xs" variant={"outline"}>
                    Upgrade
                  </Button>
                </Link>
              )} 
            </div>
          )} */}
        </div>

        <header className="fixed left-0 top-0 z-10 flex h-14 w-full items-center gap-4 border-b bg-muted px-4 md:hidden lg:h-[60px] lg:px-6">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <div className="mt-4">
                  <Logo />
                </div>
                <div className="mt-4 space-y-1">
                  {appSidebarNavigation.map((n) => {
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => {
                          setSheetOpen(!sheetOpen);
                        }}
                        className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-base text-secondary-foreground hover:text-primary"
                      >
                        <n.icon className="h-6 w-6" />
                        {n.name}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form> */}
          </div>
          <p className="text-sm text-muted-foreground">
            For support, email us at{" "}
            <a className="hover:text-primary hover:underline" href="mailto:someone@example.com">
              <i>team@moovn.co</i>
            </a>
          </p>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <UserCircleIcon className="h-7 w-7" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user && (
                <div className={"blocktext-sm cursor-pointer p-2 text-gray-700"}>
                  <Header2 title={"Welcome"} />
                  <p className="text-sm text-muted-foreground">{userDisplayName(user)}</p>
                </div>
              )}
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
        </header>

        <main
          className={`flex h-full w-screen flex-1 flex-col gap-4 p-4 pb-6 pt-2 md:w-[calc(100vw_-_${SIDEBAR_WIDTH}px)] md:px-6 lg:gap-6`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
function Logo() {
  return (
    <div className="flex items-center gap-x-2">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <MoovnLogo />
      </Link>
    </div>
  );
}
