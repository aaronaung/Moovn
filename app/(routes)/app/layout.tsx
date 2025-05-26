"use client";
import AuthProvider from "@/src/providers/auth-provider";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import Dashboard from "./_components/dashboard-layout";
import PhotopeaEditor from "./_components/photopea-editor";
import { useEmailEditor } from "@/src/contexts/email-editor";
import EmailEditor from "./_components/email-editor";
import { useRouteAccessControl } from "@/src/components/auth/access-control";

// Everything under /app is auth protected in middleware.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  const { isOpen: isPhotopeaEditorOpen } = usePhotopeaEditor();
  const { isOpen: isEmailEditorOpen } = useEmailEditor();

  // Global route access control
  useRouteAccessControl();

  return (
    <AuthProvider redirectOnUnauthed>
      {
        /** This needs to be in the DOM at all time, that way, opening the editor is instant  */
        <PhotopeaEditor />
      }
      {isEmailEditorOpen && <EmailEditor />}
      {!isPhotopeaEditorOpen && !isEmailEditorOpen && <Dashboard>{children}</Dashboard>}
    </AuthProvider>
  );
}
