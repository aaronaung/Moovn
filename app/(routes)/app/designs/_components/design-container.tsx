"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/src/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { BUCKETS } from "@/src/consts/storage";
import { generateDesign, getDesignsForTemplate } from "@/src/data/designs";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { checkIfObjectExistsAtUrl } from "@/src/libs/storage";
import { userFriendlyDate } from "@/src/libs/time";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export const DesignContainer = ({
  template,
  triggerDesignOverwrite,
  onDeleteTemplate,
  onEditTemplate,
}: {
  template: Tables<"templates">;
  triggerDesignOverwrite: (
    designId: string,
    onOverwriteComplete: () => Promise<void>,
  ) => void;
  onDeleteTemplate: () => void;
  onEditTemplate: () => void;
}) => {
  const queryClient = useQueryClient();
  const { data: designs, isLoading: isLoadingDesigns } = useSupaQuery(
    getDesignsForTemplate,
    {
      arg: template.id,
      queryKey: ["getDesignsForTemplate", template.id],
    },
  );
  const { mutateAsync: _generateDesign, isPending: isGeneratingDesign } =
    useSupaMutation(generateDesign, {
      invalidate: [["getDesignsForTemplate", template.id]],
    });
  const latestDesign = designs?.[0];

  const {
    signedUrl: jpegSignedUrl,
    loading: isLoadingJpegSignedUrl,
    refresh: refreshJpegSignedUrl,
  } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: latestDesign
      ? `${template.owner_id}/${latestDesign.id}.jpeg`
      : undefined,
  });
  const { signedUrl: psdSignedUrl } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: latestDesign
      ? `${template.owner_id}/${latestDesign.id}.psd`
      : undefined,
  });

  const renderLatestDesign = () => {
    if (isLoadingDesigns || isLoadingJpegSignedUrl) {
      return <Spinner />;
    }
    if (latestDesign) {
      return <DesignImage url={jpegSignedUrl ?? undefined} />;
    }
    return <DesignNotFound />;
  };

  return (
    <Card className="w-[400px]">
      <CardHeader className="py-4 pl-4 pr-2">
        <div className="flex">
          <div className="flex flex-1 flex-col gap-1">
            <Header2 title={template.name || "Untitled"}></Header2>
            {latestDesign?.created_at && (
              <CardDescription>
                Last refreshed:{" "}
                {userFriendlyDate(new Date(latestDesign.created_at))}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-x-0.5">
            <PencilSquareIcon
              onClick={() => {
                onEditTemplate();
              }}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary"
            />
            <TrashIcon
              onClick={() => {
                onDeleteTemplate();
              }}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center bg-secondary p-0">
        {renderLatestDesign()}
      </CardContent>
      <CardFooter className="flex flex-row-reverse gap-2 p-4">
        {latestDesign && (psdSignedUrl || jpegSignedUrl) && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline">Download</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {psdSignedUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(psdSignedUrl, `${template.name}.psd`);
                  }}
                >
                  PSD
                </DropdownMenuItem>
              )}
              {jpegSignedUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(jpegSignedUrl, `${template.name}.jpeg`);
                  }}
                >
                  JPEG
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {latestDesign && (
          <Button
            variant="outline"
            onClick={() => {
              triggerDesignOverwrite(latestDesign.id, async () => {
                refreshJpegSignedUrl();
              });
            }}
          >
            Overwrite
          </Button>
        )}
        <Button
          disabled={isGeneratingDesign}
          onClick={async () => {
            await _generateDesign({
              templateId: template.id,
            });
            queryClient.invalidateQueries({
              queryKey: ["getDesignsForTemplate", template.id],
            });
          }}
        >
          {isGeneratingDesign ? (
            <Spinner className="text-secondary" />
          ) : !latestDesign ? (
            "Generate"
          ) : (
            "Refresh"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const DesignImage = ({ url }: { url?: string }) => {
  const [imageExists, setImageExists] = useState(true);

  useEffect(() => {
    if (url) {
      checkIfObjectExistsAtUrl(url).then((exists) => {
        setImageExists(exists);
      });
    }
  }, [url]);

  if (url && imageExists) {
    return <img src={url} alt="Design" className="max-h-full max-w-full" />;
  }
  return (
    <DesignNotFound
      label={"Something went wrong. Please refresh again or contact support."}
    />
  );
};

const DesignNotFound = ({ label }: { label?: string }) => {
  return (
    <p className="px-4 text-center text-muted-foreground">
      {label || `There's no design for this template`}
    </p>
  );
};
