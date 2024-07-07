import { Spinner } from "@/src/components/common/loading-spinner";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@/src/components/ui/carousel";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getInstagramMedia } from "@/src/data/destinations-facebook";
import { publishPost } from "@/src/data/posts";
import { getScheduleDataForSource } from "@/src/data/sources";
import { getTemplatesForPost } from "@/src/data/templates";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { renderCaption } from "@/src/libs/posts";
import { signUploadUrl, signUrl } from "@/src/libs/storage";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { CloudArrowUpIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";

import { useEffect, useState } from "react";

export default function InstagramPost({
  post,
  onEditPost,
  onDeletePost,
}: {
  post: Tables<"posts"> & { destination: Tables<"destinations"> | null };
  onEditPost: () => void;
  onDeletePost: () => void;
}) {
  const { data: templates, isLoading: isLoadingTemplatesForPost } = useSupaQuery(getTemplatesForPost, {
    queryKey: ["getTemplatesForPost", post.id],
    arg: post.id,
  });
  const [designMap, setDesignMap] = useState<{ [templateId: string]: ArrayBuffer }>({});

  const { data: igMedia } = useSupaQuery(getInstagramMedia, {
    enabled: !!post.destination?.id && !!post.published_ig_media_id,
    arg: {
      destinationId: post.destination?.id ?? "",
      mediaId: post.published_ig_media_id ?? "",
    },
    queryKey: ["getInstagramMedia", post.destination?.id, post.published_ig_media_id],
  });
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(getScheduleDataForSource, {
    enabled: !!post.source_id,
    arg: {
      id: post.source_id,
      view: post.source_data_view as SourceDataView,
    },
    queryKey: ["getScheduleDataForSource", post.source_id, post.source_data_view],
  });

  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const { mutateAsync: _publishPost } = useSupaMutation(publishPost, {
    invalidate: [["getPostsByDestinationId", post.destination?.id ?? ""]],
    onSuccess: () => {
      toast({
        title: "Post published",
        variant: "success",
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "Failed to publish post",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    },
  });

  const handlePublishPost = async () => {
    try {
      setIsPublishingPost(true);

      await supaClientComponentClient.storage
        .from(BUCKETS.posts)
        .remove(Object.entries(designMap).map(([templateId, _]) => `${post.owner_id}/${templateId}.jpeg`));

      await Promise.all(
        Object.entries(designMap).map(async ([templateId, design]) => {
          const objectPath = `${post.owner_id}/${templateId}.jpeg`;
          const { token } = await signUploadUrl({
            bucket: BUCKETS.posts,
            objectPath,
            client: supaClientComponentClient,
          });
          return supaClientComponentClient.storage.from(BUCKETS.posts).uploadToSignedUrl(objectPath, token, design, {
            contentType: "image/jpeg",
          });
        }),
      );

      await _publishPost(post.id);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to publish post",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    } finally {
      setIsPublishingPost(false);
    }
  };

  if (isLoadingTemplatesForPost || isLoadingScheduleData) {
    return <Spinner className="my-2" />;
  }
  return (
    <div className="w-fit rounded-md bg-secondary" key={post.id}>
      <div className="flex items-center gap-x-1 p-2.5">
        {igMedia && igMedia.permalink && (
          <Tooltip>
            <TooltipTrigger>
              <Link href={igMedia.permalink} target="_blank">
                <div className="group cursor-pointer rounded-full p-1.5 hover:bg-primary">
                  <InstagramIcon className="h-6 w-6 text-secondary-foreground group-hover:text-secondary" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to the instagram post</TooltipContent>
          </Tooltip>
        )}
        <div className="flex-1"></div>

        {isPublishingPost || Object.keys(designMap).length !== (templates || []).length ? (
          <Spinner className="h-9 w-9" />
        ) : (
          <>
            <PencilSquareIcon
              onClick={onEditPost}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            />
            <TrashIcon
              onClick={onDeletePost}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground hover:text-secondary"
            />
            <Tooltip>
              <TooltipTrigger>
                <CloudArrowUpIcon
                  onClick={handlePublishPost}
                  className="ml-1 h-9 w-9 cursor-pointer rounded-full bg-primary p-2 text-secondary"
                />
              </TooltipTrigger>
              <TooltipContent>Publish post</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      {/** mb for carousel dots when there are more than one design */}
      <div className={cn("flex flex-col items-center", (templates || []).length > 1 && "mb-6")}>
        <Carousel className="h-[300px] w-[300px]">
          <CarouselContent>
            {(templates || []).map((template) => (
              <CarosuelImageItem
                onDesignLoaded={(design) => {
                  setDesignMap((prev) => ({
                    ...prev,
                    [template.id]: design,
                  }));
                }}
                key={template.id}
                template={template}
              />
            ))}
          </CarouselContent>
          <CarouselDots className="mt-4" />
        </Carousel>
      </div>
      <div className="max-w-[300px] overflow-scroll p-2">
        <p className="overflow-scroll whitespace-pre-wrap text-sm">
          {renderCaption(post.caption || "", scheduleData as any)}
        </p>
      </div>
    </div>
  );
}

const CarosuelImageItem = ({
  template,
  onDesignLoaded,
}: {
  template: Tables<"templates"> & { source: Tables<"sources"> | null };
  onDesignLoaded: (jpg: ArrayBuffer) => void;
}) => {
  const { generateDesign, isLoading, isScheduleEmpty } = useGenerateDesign();
  const [isLoadingOverwrites, setIsLoadingOverwrites] = useState(false);

  const designFromIndexedDb = useLiveQuery(async () => {
    const design = await db.designs.get(template.id);
    if (!design) {
      return undefined;
    }
    return {
      jpg: design.jpg,
    };
  });
  const [designOverwrite, setDesignOverwrite] = useState<{ jpg: ArrayBuffer }>();
  const designJpg = designOverwrite?.jpg || designFromIndexedDb?.jpg;

  useEffect(() => {
    if (designJpg) {
      onDesignLoaded(designJpg);
    }
  }, [designJpg]);

  useEffect(() => {
    const fetchOverwrites = async () => {
      try {
        setIsLoadingOverwrites(true);
        const signedUrl = await signUrl({
          bucket: BUCKETS.designs,
          objectPath: `${template.owner_id}/${template.id}.jpeg`,
          client: supaClientComponentClient,
        });

        const jpgData = await (await fetch(signedUrl)).arrayBuffer();
        setDesignOverwrite((prev) => ({
          ...prev,
          jpg: jpgData,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingOverwrites(false);
      }
    };
    fetchOverwrites();
    generateDesign(template);
  }, []);

  return (
    <CarouselItem
      key={template.id}
      className={cn("flex max-h-full min-h-[250px] max-w-full items-center justify-center hover:bg-secondary")}
    >
      {isLoading || isLoadingOverwrites ? (
        <Spinner />
      ) : isScheduleEmpty ? (
        <p className="text-xs text-destructive">No schedule data found for the design</p>
      ) : (
        designJpg && (
          <img src={URL.createObjectURL(new Blob([designJpg]))} className="h-full w-full" alt={template.name} />
        )
      )}
    </CarouselItem>
  );
};
