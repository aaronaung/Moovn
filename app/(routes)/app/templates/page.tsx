"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { deleteTemplate, getTemplatesForAuthUser, saveTemplate } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import { TEMPLATE_WIDTH, TemplateContainer } from "./_components/template-container";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { toast } from "@/src/components/ui/use-toast";
import { upsertObjectAtPath } from "@/src/libs/storage";
import { BUCKETS } from "@/src/consts/storage";
import { useAuthUser } from "@/src/contexts/auth";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { SourceDataView } from "@/src/consts/sources";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { ContentType } from "@/src/consts/content";
import { SIDEBAR_WIDTH } from "../_components/dashboard-layout";
import { isMobile } from "react-device-detect";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/src/components/ui/carousel";
import { cn } from "@/src/utils";

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
    designExport: DesignExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
  ) => {
    if (!designExport["psd"] || !designExport["jpg"]) {
      console.error("missing psd or jpg file in export:", {
        designExport,
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
        content_type: metadataChanges.content_type,
        owner_id: user.id,
      });

      await Promise.all([
        db.templates.put({
          templateId: saved.id,
          jpg: designExport["jpg"],
          psd: designExport["psd"],
          lastUpdated: new Date(),
        }),
        upsertObjectAtPath({
          bucket: BUCKETS.designTemplates,
          objectPath: `${user.id}/${saved.id}.psd`,
          client: supaClientComponentClient,
          content: designExport["psd"],
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
  const carouselCount = (window.innerWidth - SIDEBAR_WIDTH - 150) / TEMPLATE_WIDTH;
  const showCarousel = (templates || []).length >= carouselCount && !isMobile;

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
              .from(BUCKETS.designTemplates)
              .remove([
                `${deleteConfirmationDialogState.template.owner_id}/${deleteConfirmationDialogState.template.id}.psd`,
              ]);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />

      <div className="mb-3 mt-2 flex items-end">
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
                source_data_view: SourceDataView.Daily,
                content_type: ContentType.InstagramPost,
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
      <div
        className={cn(
          "mt-8 flex gap-3 overflow-scroll",
          showCarousel ? "justify-center" : "flex-wrap",
        )}
      >
        {!templates || templates.length === 0 ? (
          <p className="mt-16 w-full text-center text-muted-foreground">
            No templates found. Create one to get started.
          </p>
        ) : showCarousel ? (
          <Carousel className="w-[calc(100%_-_100px)]">
            <CarouselContent>
              {templates.map((template) => (
                <CarouselItem className="basis-[1/5]" key={template.id}>
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
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
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
