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

import { memo, useState } from "react";
import { DesignContainer } from "./design-container";
import { Skeleton } from "@/src/components/ui/skeleton";
import _ from "lodash";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { PublishContentRequest } from "@/app/api/content/[id]/publish/route";

export default function InstagramContent({
  content,
  onEditContent,
  onDeleteContent,
}: {
  content: Tables<"content"> & { destination: Tables<"destinations"> | null };
  onEditContent: () => void;
  onDeleteContent: () => void;
}) {
  const { data: templates, isLoading: isLoadingTemplatesForContent } = useSupaQuery(
    getTemplatesForContent,
    {
      queryKey: ["getTemplatesForContent", content.id, content.content_type],
      arg: {
        contentId: content.id,
        contentType: content.content_type,
      },
    },
  );

  const { data: igMedia } = useSupaQuery(getInstagramMedia, {
    enabled: !!content.destination?.id && !!content.published_ig_media_id,
    arg: {
      destinationId: content.destination?.id ?? "",
      mediaId: content.published_ig_media_id ?? "",
    },
    queryKey: ["getInstagramMedia", content.destination?.id, content.published_ig_media_id],
  });
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSource,
    {
      enabled: !!content.source_id,
      arg: {
        id: content.source_id,
        view: content.source_data_view as SourceDataView,
      },
      queryKey: ["getScheduleDataForSource", content.source_id, content.source_data_view],
    },
  );

  const [isPublishingContent, setIsPublishingContent] = useState(false);
  const { mutateAsync: _publishContent } = useSupaMutation(publishContent, {
    invalidate: [["getContentsByDestinationId", content.destination?.id ?? ""]],
    onSuccess: () => {
      toast({
        title: "Content published",
        variant: "success",
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "Failed to publish content",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    },
  });

  const handlePublishContent = async () => {
    if (!content.destination) {
      return;
    }

    const instagramTags: PublishContentRequest["instagramTags"] = {};
    const designMap: {
      [key: string]: {
        jpg: ArrayBuffer;
      };
    } = {};
    for (const template of templates || []) {
      const design = await db.designs.get(template.id);
      if (design) {
        designMap[template.id] = {
          jpg: design.jpg,
        };
      }
      if (design && design.instagramTags) {
        instagramTags[template.id] = design.instagramTags.map((tag) => ({
          x: tag.position.x,
          y: tag.position.y,
          username: tag.instagramTag,
        }));
      }
    }
    try {
      setIsPublishingContent(true);
      await supaClientComponentClient.storage
        .from(BUCKETS.stagingAreaForContentPublishing)
        .remove(
          Object.entries(designMap).map(
            ([templateId, _]) => `${content.owner_id}/${content.id}/${templateId}.jpg`,
          ),
        );

      await Promise.all(
        Object.entries(designMap).map(async ([templateId, design]) => {
          const objectPath = `${content.owner_id}/${content.id}/${templateId}.jpg`;
          const { token } = await signUploadUrl({
            bucket: BUCKETS.stagingAreaForContentPublishing,
            objectPath,
            client: supaClientComponentClient,
          });
          return supaClientComponentClient.storage
            .from(BUCKETS.stagingAreaForContentPublishing)
            .uploadToSignedUrl(objectPath, token, design.jpg, {
              contentType: "image/jpeg",
            });
        }),
      );

      await _publishContent({ id: content.id, body: { instagramTags } });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to publish content",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    } finally {
      setIsPublishingContent(false);
    }
  };

  if (isLoadingTemplatesForContent || isLoadingScheduleData) {
    return <Skeleton className="h-[600px] w-[300px] rounded-lg" />;
  }
  return (
    <div className="w-fit rounded-md bg-secondary" key={content.id}>
      <div className="flex items-center gap-x-1 px-3 py-3">
        {igMedia && igMedia.permalink && (
          <Tooltip>
            <TooltipTrigger>
              <Link href={igMedia.permalink} target="_blank">
                <div className="group cursor-pointer rounded-full p-1.5 hover:bg-primary">
                  <InstagramIcon className="h-6 w-6 text-secondary-foreground group-hover:text-secondary" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to the instagram content</TooltipContent>
          </Tooltip>
        )}
        <div className="group flex cursor-pointer items-center gap-1 rounded-full p-1.5 ">
          <InstagramIcon className="h-6 w-6 fill-purple-600 text-secondary-foreground" />
          <p className="text-xs font-medium text-pink-600">{content.content_type.split(" ")[1]}</p>
        </div>
        <div className="flex-1"></div>
        {isPublishingContent ? (
          <Spinner />
        ) : (
          <>
            <PencilSquareIcon
              onClick={onEditContent}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            />
            <TrashIcon
              onClick={onDeleteContent}
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground hover:text-secondary"
            />
            <Tooltip>
              <TooltipTrigger
                disabled={!content.destination?.linked_ig_user_id || _.isEmpty(scheduleData)}
              >
                <CloudArrowUpIcon
                  onClick={handlePublishContent}
                  className={cn(
                    "ml-1 h-9 w-9 cursor-pointer rounded-full bg-primary p-2 text-secondary ",
                    (!content.destination?.linked_ig_user_id || _.isEmpty(scheduleData)) &&
                      "opacity-50",
                  )}
                />
              </TooltipTrigger>
              {!content.destination?.linked_ig_user_id || _.isEmpty(scheduleData) ? (
                <></>
              ) : (
                <TooltipContent className="max-w-[300px]">
                  {!content.destination?.linked_ig_user_id
                    ? "The Destination isn't connected. Please visit the destinations page to make changes."
                    : "Publish content"}{" "}
                </TooltipContent>
              )}
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
              <CarosuelImageItem key={template.id} template={template} content={content} />
            ))}
          </CarouselContent>
          <CarouselDots className="mt-4" />
        </Carousel>
      </div>
      <div className="max-w-[300px] overflow-scroll p-2">
        <p className="overflow-scroll whitespace-pre-wrap text-sm">
          {renderCaption(content.caption || "", scheduleData as any)}
        </p>
      </div>
    </div>
  );
}

const CarosuelImageItem = memo(function CarouselImageItem({
  template,
  content,
}: {
  template: Tables<"templates">;
  content: Tables<"content">;
}) {
  return (
    <CarouselItem
      key={template.id}
      className={cn(
        "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
      )}
    >
      <DesignContainer
        source={{
          id: content.source_id,
          view: content.source_data_view as SourceDataView,
        }}
        template={template}
      />
    </CarouselItem>
  );
});
