"use client";
import AuthProvider from "@/src/providers/auth-provider";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import Dashboard from "./_components/dashboard-layout";
import PhotopeaEditor from "./_components/photopea-editor";

// Everything under /app is auth protected in middleware.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { isOpen: isPhotopeaEditorOpen } = usePhotopeaEditor();

  return (
    <AuthProvider redirectOnUnauthed>
      <PhotopeaEditor />
      {!isPhotopeaEditorOpen && <Dashboard>{children}</Dashboard>}
    </AuthProvider>
  );
}
