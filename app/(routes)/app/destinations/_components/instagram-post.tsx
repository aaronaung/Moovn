import { Spinner } from "@/src/components/common/loading-spinner";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@/src/components/ui/carousel";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { getInstagramMedia } from "@/src/data/destinations-facebook";
import { publishPost } from "@/src/data/posts";
import { getTemplatesForPost } from "@/src/data/templates";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { db } from "@/src/libs/indexeddb/indexeddb";
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
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const { data: templates, isLoading: isLoadingTemplatesForPost } = useSupaQuery(getTemplatesForPost, {
    queryKey: ["getTemplatesForPost", post.id],
    arg: post.id,
  });
  const { data: igMedia } = useSupaQuery(getInstagramMedia, {
    enabled: !!post.destination?.id && !!post.published_ig_media_id,
    arg: {
      destinationId: post.destination?.id ?? "",
      mediaId: post.published_ig_media_id ?? "",
    },
    queryKey: ["getInstagramMedia", post.destination?.id, post.published_ig_media_id],
  });

  const { mutate: _publishPost, isPending: isPublishingPost } = useSupaMutation(publishPost, {
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

  if (isLoadingTemplatesForPost || isLoadingDesigns) {
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

        {isPublishingPost ? (
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
                  onClick={() => {
                    _publishPost(post.id);
                  }}
                  className="ml-1 h-9 w-9 cursor-pointer rounded-full bg-primary p-2 text-secondary"
                />
              </TooltipTrigger>
              <TooltipContent>Publish post</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      {/** mb for carousel dots when there are more than one design */}
      <div className={cn(" flex flex-col items-center", (templates || []).length > 1 && "mb-6")}>
        <Carousel className="h-[300px] w-[300px]">
          <CarouselContent>
            {(templates || []).map((template) => (
              <CarosuelImageItem template={template} />
            ))}
          </CarouselContent>
          <CarouselDots className="mt-4" />
        </Carousel>
      </div>
      <div className="max-w-[300px] overflow-scroll p-2">
        <p className="overflow-scroll whitespace-pre-wrap text-sm">{post.caption}</p>
      </div>
    </div>
  );
}

const CarosuelImageItem = ({ template }: { template: Tables<"templates"> & { source: Tables<"sources"> | null } }) => {
  const { generateDesign, isLoading, isScheduleEmpty } = useGenerateDesign();
  const designFromIndexedDb = useLiveQuery(async () => {
    const design = await db.designs.get(template.id);
    if (!design) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([design.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(new Blob([design.psd], { type: "image/vnd.adobe.photoshop" })),
    };
  });

  useEffect(() => {
    generateDesign(template);
  }, []);

  return (
    <CarouselItem
      key={template.id}
      className={cn("flex max-h-full min-h-[250px] max-w-full items-center justify-center hover:bg-secondary")}
    >
      {isLoading ? (
        <Spinner />
      ) : isScheduleEmpty ? (
        <p className="text-xs text-destructive">No schedule data found for the design</p>
      ) : (
        <img src={designFromIndexedDb?.jpgUrl || ""} className="h-full w-full" alt={template.name} />
      )}
    </CarouselItem>
  );
};
