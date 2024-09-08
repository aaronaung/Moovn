"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { deleteTemplate, getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import { TEMPLATE_WIDTH, InstagramTemplate } from "./_components/instagram-template";
import { useAuthUser } from "@/src/contexts/auth";
import { SIDEBAR_WIDTH } from "../_components/dashboard-layout";
import { cn } from "@/src/utils";
import { deleteObject } from "@/src/data/r2";
import CreateTemplateSheet from "./_components/create-template-sheet";

export default function TemplatesPage() {
  const { user } = useAuthUser();

  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesForAuthUser, {
    queryKey: ["getTemplatesForAuthUser"],
  });
  const [createTemplateSheetOpen, setCreateTemplateSheetOpen] = useState(false);

  const { mutateAsync: _deleteTemplate, isPending: isDeletingTemplate } = useSupaMutation(
    deleteTemplate,
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
    return <Spinner className="mt-8" />;
  }

  const carouselCount = (window.innerWidth - SIDEBAR_WIDTH - 150) / TEMPLATE_WIDTH;

  return (
    <div>
      {/** Todo: check if the template is associated with any content that's to be published */}
      <CreateTemplateSheet
        user={user}
        isOpen={createTemplateSheetOpen}
        onClose={() => setCreateTemplateSheetOpen(false)}
      />
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

      <div className="mb-3 mt-2 flex items-end">
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
        <Button
          onClick={() => {
            setCreateTemplateSheetOpen(true);
          }}
        >
          Create template
        </Button>
      </div>
      <div className={cn("mt-4 flex flex-wrap gap-3 overflow-scroll")}>
        {!templates || templates.length === 0 ? (
          <p className="mt-16 w-full text-center text-muted-foreground">
            No templates found. Create one to get started.
          </p>
        ) : (
          <div className="xs:columns-1 gap-3 space-y-3 sm:columns-2 lg:columns-4">
            {templates.map((template) => (
              <div className="break-inside-avoid" key={template.id}>
                <InstagramTemplate
                  key={template.id}
                  template={template}
                  onDeleteTemplate={() => {
                    setDeleteConfirmationDialogState({
                      isOpen: true,
                      template,
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
