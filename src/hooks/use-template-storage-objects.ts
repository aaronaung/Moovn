import { Tables } from "@/types/db";
import { useEffect, useState } from "react";

import { toast } from "../components/ui/use-toast";
import { getSignedUrls } from "../libs/storage";

export const useTemplateStorageObjects = (template?: Tables<"templates">) => {
  const [templateObjects, setTemplateUrls] = useState<{ url: string; path: string }[]>([]);
  const [isLoadingTemplateObjects, setIsLoadingTemplateUrls] = useState(true);

  useEffect(() => {
    if (!template) {
      setIsLoadingTemplateUrls(false);
      return;
    }
    // Some templates - specifically instagram templates can have multiple child design templates for Carousel type posts.
    // We need to fetch the signed urls for all the child templates.
    const fetchTemplateUrls = async () => {
      try {
        setIsLoadingTemplateUrls(true);
        const urls = await getSignedUrls(
          "templates",
          `${template.owner_id}/${template.id}`,
          template.is_carousel,
        );
        setTemplateUrls(urls);
      } catch (e) {
        toast({
          title: "Error",
          variant: "destructive",
          description: "Failed to load templates",
        });
      } finally {
        setIsLoadingTemplateUrls(false);
      }
    };

    fetchTemplateUrls();
  }, [template]);

  return {
    templateObjects,
    isLoadingTemplateObjects,
  };
};
