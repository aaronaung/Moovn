import { Spinner } from "@/src/components/common/loading-spinner";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/src/components/ui/carousel";
import { toast } from "@/src/components/ui/use-toast";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getTemplatesForPost } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useEffect, useState } from "react";

export default function InstagramPost({
  post,
}: {
  post: Tables<"posts"> & { destination: Tables<"destinations"> | null };
}) {
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [designUrls, setDesignUrls] = useState<string[]>([]);
  const { data: templates, isLoading: isLoadingTemplatesForPost } = useSupaQuery(getTemplatesForPost, {
    queryKey: ["getTemplatesForPost", post.id],
    arg: post.id,
  });
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  useEffect(() => {
    if (templates && templates.length > 0) {
      const toastErr = (err: any) => {
        console.error(err);
        toast({
          title: "Failed to fetch designs",
          variant: "destructive",
        });
      };

      const fetchDesigns = async () => {
        setIsLoadingDesigns(true);

        try {
          const { data, error } = await supaClientComponentClient.storage.from(BUCKETS.designs).createSignedUrls(
            templates.map((t) => `${t.owner_id}/${t.id}/latest.jpeg`),
            24 * 3600,
          );
          if (error || !data) {
            toastErr(error || "No data returned from createSignedUrls");
            return;
          }
          setDesignUrls(data.map((d) => d.signedUrl));
        } catch (err) {
          toastErr(err);
        } finally {
          setIsLoadingDesigns(false);
        }
      };

      fetchDesigns();
    }
  }, [templates]);

  if (isLoadingTemplatesForPost || isLoadingDesigns) {
    return <Spinner />;
  }
  return (
    <div className="flex flex-col items-center">
      <Carousel setApi={setApi} className="h-[300px] w-[300px]">
        <CarouselPrevious />
        <CarouselContent>
          {designUrls.map((url) => (
            <CarouselItem key={url} className="max-h-full max-w-full">
              <img className="max-h-full max-w-full" src={url} alt={url} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
      </Carousel>
      <div>
        <p>{post.caption}</p>
      </div>
    </div>
  );
}
