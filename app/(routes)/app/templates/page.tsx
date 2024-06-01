"use client";
import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { SaveTemplateDialog } from "@/src/components/dialogs/save-template-dialog";
import TemplatesTable, {
  TemplatesTableSchema,
} from "@/src/components/tables/templates-table";
import { RowAction } from "@/src/components/tables/types";
import { Button } from "@/src/components/ui/button";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { deleteTemplate, getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { Row } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

export default function TemplatesPage() {
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(
    getTemplatesForAuthUser,
    {
      queryKey: ["getTemplatesForAuthUser"],
    },
  );
  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(
    getSourcesForAuthUser,
    {
      queryKey: ["getSourcesForAuthUser"],
    },
  );
  const { mutateAsync: _deleteTemplate, isPending: isDeletingTemplate } =
    useSupaMutation(deleteTemplate, {
      invalidate: [["getTemplatesForAuthUser"]],
    });
  const [saveTemplateDialogState, setSaveTemplateDialogState] = useState<{
    isOpen: boolean;
    template?: Tables<"templates">;
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] =
    useState<{
      isOpen: boolean;
      template?: Tables<"templates">;
    }>({
      isOpen: false,
    });

  const handleRowAction = (
    row: Row<TemplatesTableSchema>,
    action: RowAction,
  ) => {
    switch (action) {
      case RowAction.EDIT:
        setSaveTemplateDialogState({
          isOpen: true,
          template: row.original ?? undefined,
        });
        break;
      case RowAction.DELETE:
        setDeleteConfirmationDialogState({
          isOpen: true,
          template: row.original ?? undefined,
        });
        break;
    }
  };

  if (isLoadingTemplates || isLoadingSources) {
    return <Spinner />;
  }

  if (!sources || sources.length === 0) {
    return (
      <EmptyState
        title="No Sources set up"
        description="Please complete setting up at least one Source before creating a template."
        actionButtonOverride={
          <Link href="/app/sources">
            <Button>Set up a Source</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={
          "Deleting the template will also delete all designs created from it. Are you sure you want to delete this template?"
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
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Design templates" />
          <p className="text-sm text-muted-foreground">
            Design templates translate schedule data from platforms like Pike13
            or Mindbody into designs ready to be published on social media.
          </p>
        </div>
        <Button
          onClick={() => {
            setSaveTemplateDialogState({
              isOpen: true,
            });
          }}
        >
          Create template
        </Button>
      </div>
      <TemplatesTable data={templates || []} onRowAction={handleRowAction} />
    </div>
  );
}
