"use client";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";

import { Button, buttonVariants } from "@/src/components/ui/button";
import { Menu } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/src/components/ui/navigation-menu";
import { ModeToggle } from "@/src/components/common/mode-toggle";
import { MoovnLogo } from "@/src/components/ui/icons/moovn";
import Link from "next/link";
import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/24/outline";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "#about",
    label: "About",
  },
  {
    href: "#features",
    label: "Features",
  },

  {
    href: "#pricing",
    label: "Pricing",
  },

  // {
  //   href: "#faq",
  //   label: "FAQ",
  // },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b-[1px] bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container flex h-14 w-screen justify-between px-4 ">
          <NavigationMenuItem className="flex font-bold">
            <a href="/" className="ml-2 flex text-xl font-bold">
              <MoovnLogo />
            </a>
          </NavigationMenuItem>

          {/* mobile */}
          <span className="flex md:hidden">
            <ModeToggle />

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger className="px-2">
                <Menu
                  className="flex h-5 w-5 md:hidden"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="sr-only">Menu Icon</span>
                </Menu>
              </SheetTrigger>

              <SheetContent
                side={"left"}
                className="flex flex-col items-center"
              >
                <SheetHeader>
                  <SheetTitle className="text-xl font-bold">Moovn</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col items-center justify-center gap-2">
                  {routeList.map(({ href, label }: RouteProps) => (
                    <a
                      key={label}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: "ghost" })}
                    >
                      {label}
                    </a>
                  ))}
                </nav>
                <Link href="/sign-in?return_path=/app/student/explore">
                  <Button className="w-full rounded-full">
                    <ArrowRightEndOnRectangleIcon
                      className={"mr-2 h-5 w-5 shrink-0 text-secondary"}
                      aria-hidden="true"
                    />{" "}
                    Go to app
                  </Button>
                </Link>
              </SheetContent>
            </Sheet>
          </span>

          {/* desktop */}
          <nav className="hidden gap-2 md:flex">
            {routeList.map((route: RouteProps, i) => (
              <a
                href={route.href}
                key={i}
                className={`text-[17px] ${buttonVariants({
                  variant: "ghost",
                })}`}
              >
                {route.label}
              </a>
            ))}
          </nav>

          <div className="hidden gap-2 md:flex">
            <ModeToggle />
            <Link href="/sign-in?return_path=/app/student/explore">
              <Button className="w-full rounded-full">
                <ArrowRightEndOnRectangleIcon
                  className={"mr-2 h-5 w-5 shrink-0 text-secondary"}
                  aria-hidden="true"
                />{" "}
                Go to app
              </Button>
            </Link>
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}
