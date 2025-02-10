import { Button } from "@/src/components/ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-primary/10 px-4 pt-16 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col justify-center text-center lg:text-left">
            <h1 className="mt-8 text-3xl font-bold tracking-tight sm:mt-0 sm:text-4xl md:text-5xl lg:text-6xl">
              Automate Your Studio&apos;s Social Media Presence
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
              <span className="sm:hidden">
                Turn class schedules into Instagram posts instantly. Save time and keep your social
                media engaging.
              </span>
              <span className="hidden sm:inline">
                Transform your class schedules into stunning Instagram posts automatically. Save
                hours of design work and keep your social media consistently engaging.
              </span>
            </p>
            <div className="mt-8 flex justify-center sm:mt-10 lg:justify-start">
              <Link href="/app/sources">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative mt-8 lg:mt-0">
            <Image
              src="/demo.gif"
              alt="App preview"
              width={600}
              height={600}
              className="mx-auto w-full max-w-[400px] rounded-lg shadow-2xl sm:max-w-[500px] lg:max-w-none"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
