import { Tables } from "@/types/db";
import { Header2 } from "@/src/components/common/header";
import { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
import { format } from "date-fns";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { DesignImageWithIGTags } from "../schedule-content/_components/design-container";
import { InstagramTag } from "@/src/libs/designs/photopea/utils";
import { Dialog, DialogContent, DialogFooter } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { deleteContentSchedule } from "@/src/data/content";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { deconstructScheduleName, getContentIdbKey, parseRange } from "@/src/libs/content";
import InstagramContent from "../schedule-content/_components/instagram-content";
import { isMobile } from "react-device-detect";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { useState } from "react";
import { useScheduleContent } from "@/src/hooks/use-schedule-content";
import { generateDesignHash } from "@/src/libs/designs/util";
import { useQueryClient } from "@tanstack/react-query";
import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";

export default function EventDialog({
  isOpen,
  onClose,
  content,
  event,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: Tables<"content"> & { template: Tables<"templates"> | null };
  event: CalendarEvent;
}) {
  const queryClient = useQueryClient();
  const { range } = deconstructScheduleName(event.scheduleName);
  const dateRange = parseRange(range);
  const [publishDateTime, setPublishDateTime] = useState(event.start);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const idbKey = content.template
    ? getContentIdbKey(content.source_id, range, content.template)
    : "";

  const { isJobPending } = useDesignGenQueue();
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSourceByTimeRange,
    {
      queryKey: ["getScheduleDataForSourceByTimeRange", content.source_id, dateRange],
      arg: {
        dateRange,
        id: content.source_id,
      },
    },
  );
  const hasScheduleChanged =
    !isLoadingScheduleData &&
    content.data_hash !== generateDesignHash(content.template?.id ?? "", scheduleData);

  const { mutateAsync: _deleteContentSchedule } = useSupaMutation(deleteContentSchedule);

  const { scheduleContent } = useScheduleContent({
    sourceId: content.source_id,
    destinationId: content.destination_id,
    availableTemplates: content.template ? [content.template] : [],
    scheduleData,
  });

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      await _deleteContentSchedule({
        ownerId: content.owner_id,
        contentId: content.id,
        scheduleName: event.scheduleName,
      });
      toast({
        title: "Content schedule deleted.",
        variant: "success",
      });
      onClose();
      queryClient.invalidateQueries({
        queryKey: ["getContentsForAuthUser"],
      });
      queryClient.invalidateQueries({
        queryKey: ["getContentSchedules"],
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to delete content schedule.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRescheduleEvent = async () => {
    if (!content.template) {
      toast({
        title: "Cannot reschedule: Template not found.",
        variant: "destructive",
      });
      return;
    }

    setIsRescheduling(true);
    try {
      // Reschedule the content
      const contentIdbKey = getContentIdbKey(content.source_id, range, content.template);
      await scheduleContent([contentIdbKey], { [contentIdbKey]: publishDateTime });

      // Delete the existing schedule
      await _deleteContentSchedule({
        ownerId: content.owner_id,
        contentId: content.id,
        scheduleName: event.scheduleName,
      });
      toast({
        title: "Content rescheduled successfully.",
        variant: "success",
      });
      onClose();
      queryClient.invalidateQueries({
        queryKey: ["getContentsForAuthUser"],
      });
      queryClient.invalidateQueries({
        queryKey: ["getContentSchedules"],
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to reschedule content.",
        variant: "destructive",
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  const renderEventContent = () => {
    if (isLoadingScheduleData || !scheduleData) {
      return <Spinner className="my-4" />;
    }
    if ((event.previewUrls ?? []).length === 0) {
      return <p className="text-sm text-muted-foreground">No preview available.</p>;
    }

    let design = <></>;
    if (event.previewUrls?.length === 1) {
      design = (
        <div className="shrink-0">
          <DesignImageWithIGTags
            width={isMobile ? 320 : 400}
            url={event.previewUrls[0]}
            instagramTags={(content.ig_tags as InstagramTag[][])?.[0] ?? []}
            className="rounded-md"
          />
        </div>
      );
    } else {
      design = (
        <Carousel>
          <CarouselContent>
            {event.previewUrls?.map((url, index) => (
              <CarouselItem key={url}>
                <DesignImageWithIGTags
                  width={isMobile ? 320 : 400}
                  url={url}
                  instagramTags={(content.ig_tags as InstagramTag[][])?.[index] ?? []}
                  className="rounded-md"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="mb-4 mt-2" />
        </Carousel>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div>
          {hasScheduleChanged && <p className="mb-4 font-medium">Current</p>}
          <p className="mb-3 text-sm">
            Scheduled to be published on {format(event.start, "MMM, do")} at{" "}
            {event.start.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {design}
          <p className={`whitespace-pre-wrap p-2 text-sm`}>{content.ig_caption}</p>
        </div>

        {scheduleData && content.template && hasScheduleChanged && (
          <div>
            <p className="mb-2 font-medium">New</p>
            <Tooltip>
              <TooltipTrigger>
                <DateTimePicker
                  value={{
                    date: publishDateTime,
                    hasTime: true,
                  }}
                  className="mb-2 h-[32px] w-full min-w-0 rounded-md px-3"
                  onChange={(dateTime) => {
                    setPublishDateTime(dateTime.date);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{`Rescheduled date time to publish`}</TooltipContent>
            </Tooltip>
            <InstagramContent
              hideHeader
              contentIdbKey={getContentIdbKey(content.source_id, range, content.template)}
              scheduleData={scheduleData}
              template={content.template}
              width={isMobile ? 320 : 400}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[calc(100vh_-_50px)] sm:max-w-max">
        <div className="flex flex-col ">
          <Header2 title={content.template?.name ?? "Untitled"} />

          {hasScheduleChanged && (
            <p className="mb-4 text-sm text-orange-400">
              The schedule data has changed. Reschedule to publish the newly generated content.
            </p>
          )}
          {renderEventContent()}
        </div>
        <DialogFooter>
          {hasScheduleChanged && (
            <Button
              onClick={handleRescheduleEvent}
              disabled={
                isJobPending(idbKey) || isLoadingScheduleData || isRescheduling || isDeleting
              }
            >
              {isRescheduling ? <Spinner className="text-secondary" /> : `Reschedule new content`}
            </Button>
          )}
          <Button
            variant="destructive"
            className="mb-2"
            onClick={handleDeleteEvent}
            disabled={isLoadingScheduleData || isRescheduling || isDeleting}
          >
            {isDeleting ? (
              <Spinner />
            ) : (
              <>
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
