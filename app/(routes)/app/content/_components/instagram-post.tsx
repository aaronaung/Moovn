import { Spinner } from "@/src/components/common/loading-spinner";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getInstagramMedia } from "@/src/data/destinations-facebook";
import { publishContent } from "@/src/data/content";
import { getScheduleDataForSource } from "@/src/data/sources";
import { getTemplatesForContent } from "@/src/data/templates";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { renderCaption } from "@/src/libs/content";
import { signUploadUrl } from "@/src/libs/storage";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { CloudArrowUpIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { useState } from "react";
import { DesignContainer } from "./design-container";

export default function InstagramPost({
  post,
  onEditPost,
  onDeletePost,
}: {
  post: Tables<"content"> & { destination: Tables<"destinations"> | null };
  onEditPost: () => void;
  onDeletePost: () => void;
}) {
  const { data: templates, isLoading: isLoadingTemplatesForPost } = useSupaQuery(
    getTemplatesForContent,
    {
      queryKey: ["getTemplatesForContent", post.id],
      arg: post.id,
    },
  );
  const [designMap, setDesignMap] = useState<{ [templateId: string]: ArrayBuffer }>({});

  const { data: igMedia } = useSupaQuery(getInstagramMedia, {
    enabled: !!post.destination?.id && !!post.published_ig_media_id,
    arg: {
      destinationId: post.destination?.id ?? "",
      mediaId: post.published_ig_media_id ?? "",
    },
    queryKey: ["getInstagramMedia", post.destination?.id, post.published_ig_media_id],
  });
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSource,
    {
      enabled: !!post.source_id,
      arg: {
        id: post.source_id,
        view: post.source_data_view as SourceDataView,
      },
      queryKey: ["getScheduleDataForSource", post.source_id, post.source_data_view],
    },
  );

  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const { mutateAsync: _publishContent } = useSupaMutation(publishContent, {
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

  const handlePublishContent = async () => {
    try {
      setIsPublishingPost(true);

      await supaClientComponentClient.storage
        .from(BUCKETS.content)
        .remove(
          Object.entries(designMap).map(
            ([templateId, _]) => `${post.owner_id}/${post.id}/${templateId}.jpeg`,
          ),
        );

      await Promise.all(
        Object.entries(designMap).map(async ([templateId, design]) => {
          const objectPath = `${post.owner_id}/${post.id}/${templateId}.jpeg`;
          const { token } = await signUploadUrl({
            bucket: BUCKETS.content,
            objectPath,
            client: supaClientComponentClient,
          });
          return supaClientComponentClient.storage
            .from(BUCKETS.content)
            .uploadToSignedUrl(objectPath, token, design, {
              contentType: "image/jpeg",
            });
        }),
      );

      await _publishContent(post.id);
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
      <div className="flex items-center gap-x-1 px-3 pt-3">
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

        {!isPublishingPost && Object.keys(designMap).length === (templates || []).length && (
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
              <TooltipTrigger disabled={!post.destination?.linked_ig_user_id}>
                <CloudArrowUpIcon
                  onClick={handlePublishContent}
                  className={cn(
                    "ml-1 h-9 w-9 cursor-pointer rounded-full bg-primary p-2 text-secondary",
                    !post.destination?.linked_ig_user_id && "opacity-50",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                {!post.destination?.linked_ig_user_id
                  ? "The Destination isn't connected. Please visit the destinations page to make changes."
                  : "Publish post"}{" "}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      {/** mb for carousel dots when there are more than one design */}
      <div className={cn("flex flex-col items-center", (templates || []).length > 1 && "mb-6")}>
        <Carousel className="w-[300px]">
          <CarouselContent>
            {/** @eslint-ignore  */}
            {(templates ?? []).map((template) => (
              <CarosuelImageItem
                onDesignLoaded={(design) => {
                  setDesignMap((prev) => ({
                    ...prev,
                    [template.id]: design,
                  }));
                }}
                key={template.id}
                template={template}
                post={post}
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
  post,
  onDesignLoaded,
}: {
  template: Tables<"templates">;
  post: Tables<"content">;
  onDesignLoaded: (jpg: ArrayBuffer) => void;
}) => {
  return (
    <CarouselItem
      key={template.id}
      className={cn(
        "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
      )}
    >
      <DesignContainer
        source={{
          id: post.source_id,
          view: post.source_data_view as SourceDataView,
        }}
        template={template}
        onDesignLoaded={onDesignLoaded}
      />
    </CarouselItem>
  );
};
