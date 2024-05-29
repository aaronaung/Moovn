"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Pike13Logo } from "@/src/components/ui/icons/pike13";
import InputText from "@/src/components/ui/input/text";
import { toast } from "@/src/components/ui/use-toast";
import { Sources } from "@/src/consts/sources";
import { useAuthUser } from "@/src/contexts/auth";
import { getSourcesForAuthUser, saveSource } from "@/src/data/sources";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Pike13SourceSettings } from "@/src/libs/sources/pike13";
import { useEffect, useState } from "react";
import { useDebounce } from "usehooks-ts";

export default function SourcesPage() {
  const [pike13Url, setPike13Url] = useState<string>("");
  const debouncedPike13Url = useDebounce<string>(pike13Url, 1000);

  const { user } = useAuthUser();
  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(
    getSourcesForAuthUser,
    {
      queryKey: ["getSourcesForAuthUser"],
    },
  );
  const { mutate: _saveSource, isPending: isSavingSource } = useSupaMutation(
    saveSource,
    {
      invalidate: [["getSourcesForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Changes saved",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to save changes",
          variant: "destructive",
          description: "Please try again or contact support.",
        });
        setPike13Url("");
      },
    },
  );
  const pike13Source = (sources || []).find((s) => s.type === Sources.PIKE13);

  useEffect(() => {
    if (debouncedPike13Url) {
      _saveSource({
        id: pike13Source?.id,
        type: Sources.PIKE13,
        owner_id: user?.id,
        settings: {
          url: debouncedPike13Url,
        },
      });
    }
  }, [debouncedPike13Url, _saveSource, pike13Source?.id, user?.id]);

  if (isLoadingSources) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="h-fit w-fit rounded-md bg-secondary p-8">
          <Pike13Logo />
        </div>
      </div>
      <div className="mt-4 w-full">
        <div className="flex gap-2">
          <InputText
            className="mr-2 w-[400px]"
            label="Pike13 Business URL"
            onChange={(e) => {
              setPike13Url(e.target.value);
            }}
            value={
              pike13Url ||
              (pike13Source?.settings as Pike13SourceSettings)?.url ||
              ""
            }
            inputProps={{
              placeholder: "https://mybiz.pike13.com",
            }}
            description="Must not contain any trailing slashes or paths"
          />
          {isSavingSource && <Spinner />}
        </div>
      </div>
    </div>
  );
}
