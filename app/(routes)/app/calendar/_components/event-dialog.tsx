import { Tables } from "@/types/db";
import { Header2 } from "@/src/components/common/header";
import { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
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
import { ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { deleteContentSchedule } from "@/src/data/content";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";
import { deconstructScheduleName, getContentIdbKey } from "@/src/libs/content";
import InstagramContent from "../schedule-content/_components/instagram-content";
import { isMobile } from "react-device-detect";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { useEffect, useState } from "react";
import { useScheduleContent } from "@/src/hooks/use-schedule-content";
import { useQueryClient } from "@tanstack/react-query";
import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";

export default function EventDialog({
  isOpen,
  onClose,
  content,
  event,
  previewUrls,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: Tables<"content"> & { template: Tables<"templates"> | null };
  event: CalendarEvent;
  previewUrls: Map<string, string[]>;
}) {
  const queryClient = useQueryClient();

  const [publishDateTime, setPublishDateTime] = useState(event.start);
  const [selectedDesign, setSelectedDesign] = useState<"current" | "new">("current");

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { range } = deconstructScheduleName(event.scheduleName);
  const idbKey = content.template
    ? getContentIdbKey(content.source_id, range, content.template)
    : "";

  const { isJobPending } = useDesignGenQueue();

  const { mutateAsync: _deleteContentSchedule } = useSupaMutation(deleteContentSchedule);

  const { scheduleContent } = useScheduleContent({
    sourceId: content.source_id,
    destinationId: content.destination_id,
    availableTemplates: content.template ? [content.template] : [],
  });

  useEffect(() => {
    if (event.start) {
      setPublishDateTime(event.start);
    }
  }, [event]);

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
    const width = isMobile ? 320 : 400;
    const previewUrlsForContent = previewUrls.get(event.contentId);
    if (!previewUrlsForContent || previewUrlsForContent.length === 0) {
      return <p className="text-sm text-muted-foreground">No preview available.</p>;
    }

    let design = <></>;
    if (previewUrlsForContent.length === 1) {
      design = (
        <div className="shrink-0">
          <DesignImageWithIGTags
            width={width}
            url={previewUrlsForContent[0]}
            instagramTags={(content.ig_tags as InstagramTag[][])?.[0] ?? []}
          />
        </div>
      );
    } else {
      design = (
        <Carousel style={{ width }}>
          <CarouselContent>
            {previewUrlsForContent.map((url, index) => (
              <CarouselItem key={url}>
                <DesignImageWithIGTags
                  width={width}
                  url={url}
                  instagramTags={(content.ig_tags as InstagramTag[][])?.[index] ?? []}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="mb-4 mt-2" />
        </Carousel>
      );
    }

    return (
      <div className="flex flex-col gap-2 ">
        <div>
          <p className="mb-2 text-sm font-medium">Publish date time</p>
          <Tooltip>
            <TooltipTrigger autoFocus={false}>
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
            <TooltipContent side="right">{`Update date time to reschedule`}</TooltipContent>
          </Tooltip>
        </div>
        <RadioGroup
          value={selectedDesign}
          onValueChange={(value) => setSelectedDesign(value as "current" | "new")}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div
              className="cursor-pointer"
              onClick={() => {
                setSelectedDesign("current");
              }}
            >
              {event.hasDataChanged && (
                <div className="mb-2 flex items-center gap-2 ">
                  <RadioGroupItem value="current" />
                  <p className="text-sm font-medium">Current</p>
                </div>
              )}
              {design}
              <p className={`whitespace-pre-wrap p-2 text-sm`}>{content.ig_caption}</p>
            </div>

            {event.data && content.template && event.hasDataChanged && (
              <div
                className="cursor-pointer"
                onClick={() => {
                  setSelectedDesign("new");
                }}
              >
                <div className="mb-2 flex items-center gap-2 ">
                  <RadioGroupItem value="new" />
                  <p className="text-sm font-medium">New</p>
                </div>
                <InstagramContent
                  hideHeader
                  contentIdbKey={getContentIdbKey(content.source_id, range, content.template)}
                  scheduleData={event.data}
                  template={content.template}
                  width={width}
                  disableImageViewer={true}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </div>
    );
  };

  const publishDateChanged = event.start.getTime() !== publishDateTime.getTime();
  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        setPublishDateTime(event.start);
        setSelectedDesign("current");
        onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100vh_-_50px)] sm:max-w-max">
        <div className="flex flex-col ">
          <Header2 className="mb-4" title={content.template?.name ?? "Untitled"} />

          {event.hasDataChanged && (
            <p className="mb-4 text-sm text-orange-400">
              The schedule data has changed. Reschedule to publish the newly generated content.
            </p>
          )}
          {renderEventContent()}
        </div>
        <DialogFooter>
          <Button
            onClick={handleRescheduleEvent}
            disabled={
              (isJobPending(idbKey) || isRescheduling || isDeleting || !publishDateChanged) &&
              selectedDesign === "current"
            }
          >
            {isRescheduling ? (
              <Spinner className="text-secondary" />
            ) : (
              <>
                <ClockIcon className="mr-2 h-4 w-4" />
                Reschedule
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            className="mb-2"
            onClick={handleDeleteEvent}
            disabled={isRescheduling || isDeleting}
          >
            {isDeleting ? (
              <Spinner className="text-secondary" />
            ) : (
              <>
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
