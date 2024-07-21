"use client";
import { createContext, useContext, useState } from "react";

export type EmailEditorMetadata = {
  title: string;
  initialJson: string;
};

type EmailTemplate = {
  html: string;
  json: string;
};

type EmailEditorOptions = {
  onSave?: (emailTemplate: EmailTemplate, metadata: Partial<EmailEditorMetadata>) => Promise<void>;
  onSaveConfirmationTitle?: string;
  isMetadataEditable?: boolean;
};

type EmailEditorContextValue = {
  isOpen: boolean;
  close: () => void;
  save: (emailTemplate: EmailTemplate, metadata: EmailEditorMetadata) => Promise<void>;
  isSaving: boolean;
  open: (metadata: EmailEditorMetadata, options: EmailEditorOptions) => void;
  options?: EmailEditorOptions;
  metadata: EmailEditorMetadata;
};

const EmailEditorContext = createContext<EmailEditorContextValue | null>(null);

function useEmailEditor() {
  const context = useContext(EmailEditorContext);
  if (!context) {
    throw new Error(`useEmailEditor must be used within a EmailEditorProvider`);
  }
  return context;
}

function EmailEditorProvider({ children }: { children: React.ReactNode }) {
  const [metadata, setMetadata] = useState<EmailEditorMetadata>({
    title: "Untitled",
    initialJson: "{}",
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<EmailEditorOptions>({
    isMetadataEditable: true,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const open = (metadata: EmailEditorMetadata, options?: EmailEditorOptions) => {
    setMetadata(metadata);
    setIsOpen(true);
    setOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  const save = async (emailTemplate: EmailTemplate, metadata: Partial<EmailEditorMetadata>) => {
    try {
      setIsSaving(true);
      await options.onSave?.(emailTemplate, metadata);
    } catch (err) {
      console.error("failed to save editor changes", err);
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    setOptions({});
    setIsOpen(false);
  };

  return (
    <EmailEditorContext.Provider
      value={{
        isOpen,
        options,
        close,
        open,
        save,
        isSaving,
        metadata,
      }}
    >
      {children}
    </EmailEditorContext.Provider>
  );
}

export { useEmailEditor, EmailEditorProvider };
export default EmailEditorContext;
