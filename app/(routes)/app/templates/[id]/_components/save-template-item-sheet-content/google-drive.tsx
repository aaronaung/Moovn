"use client";

import { Button } from "@/src/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tables } from "@/types/db";
import { Spinner } from "@/src/components/common/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { drive_v3 } from "googleapis";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { getDriveSourcesWithAccessToken, listDriveFolders } from "@/src/data/sources";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { FileIcon, FolderIcon } from "lucide-react";
import { Header2 } from "@/src/components/common/header";
import InputText from "@/src/components/ui/input/text";
import { saveTemplate, saveTemplateItem } from "@/src/data/templates";
import { SourceDataView } from "@/src/consts/sources";
import { ContentItemType, ContentType } from "@/src/consts/content";
import { toast } from "@/src/components/ui/use-toast";
import { DriveTemplateItemMetadata } from "@/src/consts/templates";
import { SheetFooter } from "@/src/components/ui/sheet";
import { db } from "@/src/libs/indexeddb/indexeddb";

export default function SaveDriveTemplateItem({
  user,
  parentTemplate,
  itemPosition,
  onAddComplete,
  sourceDataView,
  contentType,
  templateItem,
}: {
  user: Tables<"users">;
  parentTemplate?: Tables<"templates">; // if provided, we're adding to a carousel
  itemPosition: number;
  onAddComplete: (newTemplateItem: Tables<"template_items">) => void;
  sourceDataView: SourceDataView;
  contentType: ContentType;
  templateItem?: Tables<"template_items">; // if provided, we're editing an existing template item
}) {
  const templateItemMetadata = templateItem?.metadata as DriveTemplateItemMetadata;
  const [selectedSource, setSelectedSource] = useState<
    (Tables<"sources"> & { access_token: string }) | undefined
  >(undefined);
  const [selectedFolder, setSelectedFolder] = useState<drive_v3.Schema$File | null>(
    templateItemMetadata?.drive_folder_id && templateItemMetadata.drive_folder_name
      ? {
          id: templateItemMetadata.drive_folder_id,
          name: templateItemMetadata.drive_folder_name,
        }
      : null,
  );
  const [fileName, setFileName] = useState<string>(templateItemMetadata?.drive_file_name ?? "1");
  const [templateName, setTemplateName] = useState<string>(parentTemplate?.name ?? "");

  const { data: driveSources, isLoading: isSourcesLoading } = useSupaQuery(
    getDriveSourcesWithAccessToken,
    { queryKey: ["getDriveSourcesWithAccessToken"] },
  );

  const { data: folders, isLoading: isFoldersLoading } = useSupaQuery(listDriveFolders, {
    queryKey: ["listDriveFolders", selectedSource?.id],
    arg: selectedSource?.id ?? driveSources?.[0]?.id ?? "",
    enabled: !!selectedSource || !!driveSources?.[0]?.id,
  });

  const { mutateAsync: _saveTemplate } = useSupaMutation(saveTemplate, {
    invalidate: [["getAllTemplates"]],
  });
  const { mutateAsync: _saveTemplateItem } = useSupaMutation(saveTemplateItem, {
    invalidate: [["getTemplateItemsByTemplateId", parentTemplate?.id ?? ""]],
  });

  useEffect(() => {
    if (driveSources?.[0]?.id) {
      setSelectedSource(
        templateItemMetadata?.drive_source_id
          ? driveSources.find((source) => source.id === templateItemMetadata.drive_source_id)
          : driveSources[0],
      );
    }
  }, [driveSources]);

  const handleAddTemplateItem = async () => {
    if (!selectedFolder || !fileName) {
      return;
    }
    try {
      let template = parentTemplate;
      if (!template) {
        template = await _saveTemplate({
          name: templateName,
          source_data_view: sourceDataView,
          content_type: contentType,
          owner_id: user.id,
        });
      }
      const metadata = {
        drive_source_id: selectedSource?.id,
        drive_folder_id: selectedFolder.id,
        drive_folder_name: selectedFolder.name,
        drive_file_name: fileName,
      } as DriveTemplateItemMetadata;

      const savedTemplateItem = await _saveTemplateItem({
        ...(templateItem ? { id: templateItem.id } : {}),
        template_id: template.id,
        position: itemPosition,
        type: ContentItemType.DriveFile,
        metadata,
      });
      await db.templateItems.put({
        key: savedTemplateItem.id,
        type: ContentItemType.AutoGenDesign,
        position: itemPosition,
        template_id: template.id,
        metadata,
        updated_at: new Date(),
        created_at: new Date(),
      }),
        toast({
          variant: "success",
          title: "Template item saved",
        });
      onAddComplete(savedTemplateItem);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save template item. Please try again or contact support",
      });
      console.error(error);
    }
  };

  if (isSourcesLoading) {
    return <Spinner />;
  }

  if (!driveSources || driveSources.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">No Google Drive Sources</h2>
        <p className="text-sm text-muted-foreground">
          You need to add a Google Drive source to continue.
        </p>
        <Link href="/app/sources">
          <Button>Add Google Drive Source</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-scroll p-1">
        {!parentTemplate && (
          <InputText
            label="Template name"
            onChange={(e) => setTemplateName(e.target.value)}
            value={templateName}
            className="w-[300px]"
            inputProps={{
              placeholder: "Studio XYZ Daily",
            }}
          />
        )}
        <div>
          <Header2 title="Select the root folder" />
          <div className="mb-2">
            {driveSources.length > 1 ? (
              <Select
                value={selectedSource?.id ?? templateItemMetadata.drive_source_id}
                onValueChange={(value) =>
                  setSelectedSource(driveSources.find((source) => source.id === value))
                }
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a Drive account" />
                </SelectTrigger>
                <SelectContent>
                  {driveSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Using Drive data source: <b>{driveSources[0]?.name}</b>
              </p>
            )}
          </div>

          {isFoldersLoading ? (
            <div className="flex justify-center">
              <Spinner />
            </div>
          ) : folders ? (
            <div>
              <ScrollArea className="h-[250px] w-full rounded-md border p-4">
                {folders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant={selectedFolder?.id === folder.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <FolderIcon className="mr-2 h-4 w-4" />
                    {folder.name}
                  </Button>
                ))}
              </ScrollArea>
            </div>
          ) : null}
        </div>

        <div>
          <Header2 title="Enter the standardized file name" />
          <p className="mb-2 text-sm text-muted-foreground">
            The file name will be used to identify the file in the date sub-folder. The file name
            MUST be consistent across all date sub-folders. For example: Root/2024-10-25/filename,
            Root/2024-10-26/filename, Root/2024-10-27/filename
          </p>
          <InputText
            onChange={(e) => setFileName(e.target.value)}
            value={fileName}
            className="w-[100px]"
          />
        </div>

        {selectedFolder && fileName && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              When generating content for this template item, we will use the file from the
              following path:
            </p>
            <div className="mt-2 flex items-center">
              <FileIcon className="mr-1 h-4 w-4" />
              <p className="text-sm font-semibold">
                {selectedFolder.name}/YYYY-MM-DD/{fileName}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              e.g. {selectedFolder.name}/{new Date().toISOString().split("T")[0]}/{fileName}
            </p>
          </div>
        )}
      </div>
      <SheetFooter>
        <Button size="lg" onClick={handleAddTemplateItem} disabled={!selectedFolder || !fileName}>
          {templateItem ? "Update Template Item" : "Add Template Item"}
        </Button>
      </SheetFooter>
    </>
  );
}
