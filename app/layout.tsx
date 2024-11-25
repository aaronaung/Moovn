import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryClient, QueryCache } from "@tanstack/react-query";
import ReactQueryProvider from "@/src/providers/react-query-provider";
import { Toaster } from "@/src/components/ui/toaster";
import { toast } from "@/src/components/ui/use-toast";
import ReactDnDProvider from "@/src/providers/react-dnd-provider";
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { AsyncFileUploadProvider } from "@/src/contexts/async-file-upload";
import { ThemeProvider } from "@/src/providers/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PhotopeaHeadlessProvider } from "@/src/contexts/photopea-headless";
import { PhotopeaEditorProvider } from "@/src/contexts/photopea-editor";
import { EmailEditorProvider } from "@/src/contexts/email-editor";
import { DesignGenQueueProvider } from "@/src/contexts/design-gen-queue";
import { Suspense } from "react";
import { Spinner } from "@/src/components/common/loading-spinner";
import StaffImagesPrefetch from "@/src/components/staff-images-prefetch";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moovn",
  description: "All in one dance platform",
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query?.meta?.errorMessage) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `${query.meta.errorMessage}: ${error.message}`,
        });
      }
    },
  }),
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${inter.className} ${
          process.env.NODE_ENV === "development" ? "debug-screens" : ""
        } overscroll-none`}
        suppressHydrationWarning
      >
        <AsyncFileUploadProvider>
          <ReactQueryProvider>
            <ReactQueryDevtools initialIsOpen={false} />
            <Suspense fallback={<Spinner className="my-32" />}>
              <PhotopeaHeadlessProvider>
                <PhotopeaEditorProvider>
                  <EmailEditorProvider>
                    <DesignGenQueueProvider>
                      <ReactDnDProvider>
                        <ThemeProvider
                          attribute="class"
                          defaultTheme="system"
                          enableSystem
                          disableTransitionOnChange
                          storageKey="moovn-theme"
                        >
                          <div className="h-full overscroll-none scroll-smooth bg-background">
                            <TooltipProvider>{children}</TooltipProvider>
                            <StaffImagesPrefetch />
                          </div>
                        </ThemeProvider>
                      </ReactDnDProvider>
                    </DesignGenQueueProvider>
                  </EmailEditorProvider>
                </PhotopeaEditorProvider>
              </PhotopeaHeadlessProvider>
            </Suspense>
          </ReactQueryProvider>
        </AsyncFileUploadProvider>
        <Toaster />
      </body>
    </html>
  );
}
