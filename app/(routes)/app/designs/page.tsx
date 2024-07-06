"use client";
import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { OverwriteDesignDialog } from "@/src/components/dialogs/overwrite-design-dialog";
import { SaveTemplateDialog } from "@/src/components/dialogs/save-template-dialog";
import { Button } from "@/src/components/ui/button";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { deleteTemplate, getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import Link from "next/link";
import { useState } from "react";
import { DesignContainer } from "./_components/design-container";

export default function DesignsPage() {
  const [overwriteDesignDialogState, setOverwriteDesignDialogState] = useState<{
    isOpen: boolean;
    designId?: string;
    onOverwriteComplete?: () => Promise<void>;
  }>({
    isOpen: false,
  });
  const [saveTemplateDialogState, setSaveTemplateDialogState] = useState<{
    isOpen: boolean;
    template?: Tables<"templates">;
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    template?: Tables<"templates">;
  }>({
    isOpen: false,
  });

  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesForAuthUser, {
    queryKey: ["getTemplatesForAuthUser"],
  });
  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(getSourcesForAuthUser, {
    queryKey: ["getSourcesForAuthUser"],
  });
  const { mutateAsync: _deleteTemplate, isPending: isDeletingTemplate } = useSupaMutation(deleteTemplate, {
    invalidate: [["getTemplatesForAuthUser"]],
  });

  if (isLoadingTemplates || isLoadingSources) {
    return <Spinner />;
  }

  if (!sources || sources.length === 0) {
    return (
      <EmptyState
        title="No Sources set up"
        description="Please complete setting up at least one Source before creating designs."
        actionButtonOverride={
          <Link href="/app/sources">
            <Button>Set up a Source</Button>
          </Link>
        }
      />
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <>
        <SaveTemplateDialog
          isOpen={saveTemplateDialogState.isOpen}
          onClose={() => {
            setSaveTemplateDialogState({
              isOpen: false,
            });
          }}
          availableSources={sources}
        />
        <EmptyState
          title="No designs found"
          description="Start by creating a design template."
          actionButtonOverride={
            <Button
              onClick={() => {
                setSaveTemplateDialogState({
                  isOpen: true,
                });
              }}
            >
              Create design template
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div>
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={"This will delete the design template and all designs created from it. Are you sure?"}
        isDeleting={isDeletingTemplate}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.template) {
            await _deleteTemplate(deleteConfirmationDialogState.template);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />
      <SaveTemplateDialog
        isOpen={saveTemplateDialogState.isOpen}
        initFormValues={saveTemplateDialogState.template}
        onClose={() => {
          setSaveTemplateDialogState({
            isOpen: false,
          });
        }}
        availableSources={sources}
      />
      <OverwriteDesignDialog
        designId={overwriteDesignDialogState.designId}
        onClose={() => {
          setOverwriteDesignDialogState({
            isOpen: false,
          });
        }}
        onOverwriteComplete={overwriteDesignDialogState.onOverwriteComplete}
        isOpen={overwriteDesignDialogState.isOpen}
      />
      <div className="mb-5 flex items-end">
        <div className="flex-1">
          <Header2 title="Designs" />
          <p className="text-sm text-muted-foreground">
            Designs are auto-generated from the{" "}
            <a className="text-primary underline" href="/app/sources">
              Source
            </a>{" "}
            data given a design template. Not seeing the designs as expected? Please refresh the design or email us at{" "}
            <a className="hover:text-primary hover:underline" href="mailto:someone@example.com">
              <i>team@moovn.co</i>
            </a>{" "}
            for support.
          </p>
        </div>
        <Button
          onClick={() => {
            setSaveTemplateDialogState({
              isOpen: true,
            });
          }}
        >
          Create design
        </Button>
      </div>
      <div className="flex flex-wrap gap-4">
        {([...templates] || []).map((template) => (
          <DesignContainer
            key={template.id}
            template={template}
            onDeleteTemplate={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                template,
              });
            }}
            onEditTemplate={() => {
              setSaveTemplateDialogState({
                isOpen: true,
                template,
              });
            }}
            // triggerDesignOverwrite={(designId: string, onOverwriteComplete) => {
            //   setOverwriteDesignDialogState({
            //     isOpen: true,
            //     designId,
            //     onOverwriteComplete,
            //   });
            // }}
          />
        ))}
      </div>
    </div>
  );
}
