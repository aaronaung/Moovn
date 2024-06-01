"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { OverwriteDesignDialog } from "@/src/components/dialogs/overwrite-design-dialog";
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
import { getTemplatesForAuthUser } from "@/src/data/templates";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { checkIfObjectExistsAtUrl } from "@/src/libs/storage";
import { userFriendlyDate } from "@/src/libs/time";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function DesignsPage() {
  const [overwriteDesignDialogState, setOverwriteDesignDialogState] = useState<{
    isOpen: boolean;
    designId?: string;
    onOverwriteComplete?: () => Promise<void>;
  }>({
    isOpen: false,
  });
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(
    getTemplatesForAuthUser,
    {
      queryKey: ["getTemplatesForAuthUser"],
    },
  );

  if (isLoadingTemplates) {
    return <Spinner />;
  }

  return (
    <div>
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
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Designs" />
          <p className="text-sm text-muted-foreground">
            Designs are content generated from templates and are ready to be
            published.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {(templates || []).map((template) => (
          <DesignContainer
            key={template.id}
            template={template}
            triggerDesignOverwrite={(designId: string, onOverwriteComplete) => {
              setOverwriteDesignDialogState({
                isOpen: true,
                designId,
                onOverwriteComplete,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

const DesignContainer = ({
  template,
  triggerDesignOverwrite,
}: {
  template: Tables<"templates">;
  triggerDesignOverwrite: (
    designId: string,
    onOverwriteComplete: () => Promise<void>,
  ) => void;
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
      <CardHeader className="py-4">
        <Header2 title={template.name || "Untitled"}></Header2>
        {latestDesign?.created_at && (
          <CardDescription>
            Last refreshed:{" "}
            {userFriendlyDate(new Date(latestDesign.created_at))}
          </CardDescription>
        )}
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
