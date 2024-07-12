"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { deleteTemplate, getTemplatesForAuthUser, saveTemplate } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import { TemplateContainer } from "./_components/template-container";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { FileExport } from "@/src/contexts/photopea-headless";
import { toast } from "@/src/components/ui/use-toast";
import { upsertObjectAtPath } from "@/src/libs/storage";
import { BUCKETS } from "@/src/consts/storage";
import { useAuthUser } from "@/src/contexts/auth";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { SourceDataView } from "@/src/consts/sources";
import { db } from "@/src/libs/indexeddb/indexeddb";

export default function TemplatesPage() {
  const { user } = useAuthUser();
  const { open: openPhotopeaEditor, close } = usePhotopeaEditor();
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesForAuthUser, {
    queryKey: ["getTemplatesForAuthUser"],
  });

  const { mutateAsync: _deleteTemplate, isPending: isDeletingTemplate } = useSupaMutation(
    deleteTemplate,
    {
      invalidate: [["getTemplatesForAuthUser"]],
    },
  );
  const { mutateAsync: _saveTemplate, isPending: isSavingTemplate } = useSupaMutation(
    saveTemplate,
    {
      invalidate: [["getTemplatesForAuthUser"]],
    },
  );

  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    template?: Tables<"templates">;
  }>({
    isOpen: false,
  });

  if (isLoadingTemplates || !user) {
    return <Spinner />;
  }

  const handleTemplateCreate = async (
    fileExport: FileExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
  ) => {
    if (!fileExport["psd"] || !fileExport["jpg"]) {
      console.error("missing psd or jpg file in export:", {
        fileExport,
      });
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support.",
      });
      return;
    }

    try {
      const saved = await _saveTemplate({
        name: metadataChanges.title,
        source_data_view: metadataChanges.source_data_view,
        owner_id: user.id,
      });

      await Promise.all([
        db.templates.put({
          templateId: saved.id,
          jpg: fileExport["jpg"],
          psd: fileExport["psd"],
          lastUpdated: new Date(),
        }),
        upsertObjectAtPath({
          bucket: BUCKETS.templates,
          objectPath: `${user.id}/${saved.id}.psd`,
          client: supaClientComponentClient,
          content: fileExport["psd"],
          contentType: "image/vnd.adobe.photoshop",
        }),
      ]);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support",
      });
    } finally {
      close();
    }

    toast({
      variant: "success",
      title: "Template saved",
    });
  };

  return (
    <div>
      {/** Todo: check if the template is associated with any content that's to be published */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={
          "You'll no longer be able to generate designs from this template. Are you sure you want to delete this template?"
        }
        isDeleting={isDeletingTemplate}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.template) {
            await _deleteTemplate(deleteConfirmationDialogState.template);
            await supaClientComponentClient.storage
              .from(BUCKETS.templates)
              .remove([
                `${deleteConfirmationDialogState.template.owner_id}/${deleteConfirmationDialogState.template.id}.psd`,
              ]);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />

      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Design templates" />
          <p className="text-sm text-muted-foreground">
            {`Design templates translate your schedule data into designs ready to be published to a
            destination.`}
          </p>
        </div>
        <Button
          disabled={isSavingTemplate}
          onClick={() => {
            openPhotopeaEditor(
              {
                title: "Untitled",
                source_data_view: SourceDataView.TODAY,
              },
              new ArrayBuffer(0),
              {
                onSave: handleTemplateCreate,
                isMetadataEditable: true,
              },
            );
          }}
        >
          {isSavingTemplate ? <Spinner /> : "Create template"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-4">
        {!templates || templates.length === 0 ? (
          <p className="mt-16 w-full text-center text-muted-foreground">
            No templates found. Create one to get started.
          </p>
        ) : (
          templates.map((template) => (
            <TemplateContainer
              key={template.id}
              template={template}
              onDeleteTemplate={() => {
                setDeleteConfirmationDialogState({
                  isOpen: true,
                  template,
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
