"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { deleteTemplate, getAllTemplates } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import { InstagramTemplate } from "./_components/instagram-template";
import { useAuthUser } from "@/src/contexts/auth";
import { deleteObject } from "@/src/data/r2";
import EmptyState from "@/src/components/common/empty-state";
import { useRouter } from "next/navigation";
import { SaveTemplateItemSheet } from "./[id]/_components/save-template-item-sheet";

export default function TemplatesPage() {
  const { user } = useAuthUser();
  const router = useRouter();

  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    template?: Awaited<ReturnType<typeof getAllTemplates>>[number];
  }>({
    isOpen: false,
  });
  const [saveTemplateItemState, setSaveTemplateItemState] = useState<{
    isOpen: boolean;
    template?: Tables<"templates">;
    templateItem?: Tables<"template_items">;
  }>({
    isOpen: false,
  });

  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getAllTemplates, {
    queryKey: ["getAllTemplates"],
  });
  const hasTemplates = templates && templates.length > 0;

  const { mutateAsync: _deleteTemplate, isPending: isDeletingTemplate } = useSupaMutation(
    deleteTemplate,
    {
      invalidate: [["getAllTemplates"]],
    },
  );

  if (isLoadingTemplates || !user) {
    return <Spinner className="mt-8" />;
  }

  return (
    <>
      {/** Todo: check if the template is associated with any content that's to be published */}

      <SaveTemplateItemSheet
        user={user}
        isOpen={saveTemplateItemState.isOpen}
        onClose={() => setSaveTemplateItemState({ isOpen: false })}
        parentTemplate={saveTemplateItemState.template}
        itemPosition={saveTemplateItemState.templateItem?.position ?? 0}
        templateItem={saveTemplateItemState.templateItem}
        onAddComplete={() => {
          setSaveTemplateItemState({ isOpen: false });
        }}
      />

      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={
          "Deleting this template will delete all associated scheduled contents. Are you sure you want to delete this template?"
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
            await deleteObject(
              "templates",
              `${deleteConfirmationDialogState.template.owner_id}/${deleteConfirmationDialogState.template.id}.psd`,
            );
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />

      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Design templates" />
          <p className="hidden text-sm text-muted-foreground sm:block">
            {`Create templates for your designs and streamline your content creation process. Once you've created templates, set up `}
            <a className="text-primary underline" href="/app/destinations">
              destinations
            </a>
            {` to publish your generated content.`}
          </p>
        </div>
        {hasTemplates && (
          <Button
            onClick={() => {
              setSaveTemplateItemState({
                isOpen: true,
              });
            }}
          >
            Create template
          </Button>
        )}
      </div>

      {hasTemplates ? (
        <div className="flex flex-wrap gap-3 overflow-scroll">
          <div className="xs:columns-1 gap-3 space-y-3 sm:columns-2 lg:columns-4">
            {!hasTemplates && (
              <EmptyState description="No templates found. Create one to get started." />
            )}
            {(templates ?? []).map((template) => (
              <div className="break-inside-avoid" key={template.id}>
                <InstagramTemplate
                  key={template.id}
                  template={template}
                  onAddToCarousel={() => {
                    router.push(`/app/templates/${template.id}`);
                  }}
                  onDeleteTemplate={() => {
                    setDeleteConfirmationDialogState({
                      isOpen: true,
                      template,
                    });
                  }}
                  onEditTemplateItem={(templateItem) => {
                    setSaveTemplateItemState({
                      isOpen: true,
                      template: template,
                      templateItem,
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          description="No templates found. Create one to get started."
          actionButtonOverride={
            <Button
              onClick={() => {
                setSaveTemplateItemState({
                  isOpen: true,
                });
              }}
            >
              Create template
            </Button>
          }
        />
      )}
    </>
  );
}
