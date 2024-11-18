"use client";

import { Button } from "@/src/components/ui/button";
import { ModeToggle } from "@/src/components/common/mode-toggle";
import { MoovnLogo } from "@/src/components/ui/icons/moovn";
import Link from "next/link";
import { cn } from "@/src/utils";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet";

const navItems = [
  { name: "Features", href: "#features" },
  { name: "Integrations", href: "#integrations" },
  { name: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "border-b bg-background" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <MoovnLogo width={70} height={70} />
        </Link>
        <div className="hidden items-center space-x-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {item.name}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <div className="hidden lg:block">
            <Link href="/app/sources">
              <Button>Get Started</Button>
            </Link>
          </div>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" className="flex items-center">
                      <MoovnLogo width={70} height={70} />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-4">
                  {navItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <Link href="/app/sources" className="mt-8">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
