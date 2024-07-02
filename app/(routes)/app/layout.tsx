"use client";
import AuthProvider from "@/src/providers/auth-provider";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import Dashboard from "./_components/dashboard-layout";
import { Button } from "@/src/components/ui/button";

// Everything under /app is auth protected in middleware.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { src: ppEditorSrc, setSrc: setPPEditorSrc } = usePhotopeaEditor();

  return (
    <AuthProvider redirectOnUnauthed>
      {ppEditorSrc ? (
        <div className="p-4">
          <Button
            onClick={() => {
              setPPEditorSrc(null);
            }}
          >
            Exit
          </Button>
          <iframe src={ppEditorSrc} className="h-screen w-full"></iframe>
        </div>
      ) : (
        <Dashboard>{children}</Dashboard>
      )}
    </AuthProvider>
  );
}
