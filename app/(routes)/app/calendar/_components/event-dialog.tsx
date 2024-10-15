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
import { Button } from "@/src/components/ui/button";
import { ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { deleteContentSchedule, saveContent, saveContentSchedule } from "@/src/data/content";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";
import {
  atScheduleExpression,
  deconstructScheduleName,
  generateCaption,
  getContentIdbKey,
  getScheduleName,
} from "@/src/libs/content";
import { InstagramContent } from "../schedule-content/_components/instagram-content";
import { isMobile } from "react-device-detect";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { useEffect, useState } from "react";
import { useScheduleContent } from "@/src/hooks/use-schedule-content";
import { useQueryClient } from "@tanstack/react-query";
import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { cn } from "@/src/utils";
import { scheduleContent as upsertSchedulesOnEventBridge } from "@/src/data/content";
import { EditableCaption } from "@/src/components/ui/content/instagram/editable-caption";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";

export default function EventDialog({
  isOpen,
  onClose,
  event,
  previewUrls,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  previewUrls: Map<string, string[]>;
}) {
  const { content } = event;
  const queryClient = useQueryClient();
  const { mutateAsync: _deleteContentSchedule } = useSupaMutation(deleteContentSchedule);
  const { mutateAsync: _saveContent } = useSupaMutation(saveContent);
  const { mutateAsync: _saveContentSchedule } = useSupaMutation(saveContentSchedule);

  const [publishDateTime, setPublishDateTime] = useState<{ date: Date; error: string | undefined }>(
    {
      date: event.start,
      error: undefined,
    },
  );
  const [currCaption, setCurrCaption] = useState<string>(content.ig_caption ?? "");
  const [newCaption, setNewCaption] = useState<string>(
    generateCaption(content.template?.ig_caption_template ?? "", event.data),
  );
  const [selectedDesign, setSelectedDesign] = useState<"current" | "new">("current");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { range } = deconstructScheduleName(event.scheduleName);
  const idbKey = content.template
    ? getContentIdbKey(content.source_id, range, content.template)
    : "";

  const { isJobPending } = useDesignGenQueue();

  const { scheduleContent } = useScheduleContent({
    sourceId: content.source_id,
    destinationId: content.destination_id,
    availableTemplates: content.template ? [content.template] : [],
  });

  const publishDateChanged = event.start.getTime() !== publishDateTime.date.getTime();

  useEffect(() => {
    resetState();
    // we need to reset the state when the event changes.
  }, [event]);

  const resetState = () => {
    setPublishDateTime({
      date: event.start,
      error: undefined,
    });
    setSelectedDesign("current");
    setCurrCaption(content.ig_caption ?? "");
    setNewCaption(generateCaption(content.template?.ig_caption_template ?? "", event.data));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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
      handleClose();
      queryClient.invalidateQueries({
        queryKey: ["getAllContents"],
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

      if (selectedDesign === "current") {
        const currCaptionChanged = currCaption !== content.ig_caption;

        if (currCaptionChanged) {
          await _saveContent({
            ...content,
            ig_caption: currCaption,
            updated_at: new Date().toISOString(),
          });
        }
        if (publishDateChanged) {
          const scheduleName = getScheduleName(range, content.id);
          const newScheduleExpression = atScheduleExpression(publishDateTime.date);
          await _saveContentSchedule({
            content_id: content.id,
            name: scheduleName,
            owner_id: content.owner_id,
            schedule_expression: newScheduleExpression,
            updated_at: new Date().toISOString(),
          });
          await upsertSchedulesOnEventBridge([
            {
              contentId: content.id,
              contentPath: `${content.owner_id}/${content.id}`,
              scheduleName,
              scheduleExpression: newScheduleExpression,
            },
          ]);
        }
      } else {
        await scheduleContent(
          [contentIdbKey],
          { [contentIdbKey]: publishDateTime },
          { [contentIdbKey]: newCaption },
        );
        // Delete the existing schedule
        await _deleteContentSchedule({
          ownerId: content.owner_id,
          contentId: content.id,
          scheduleName: event.scheduleName,
        });
      }

      toast({
        title: "Content rescheduled successfully.",
        variant: "success",
      });
      handleClose();
      queryClient.invalidateQueries({
        queryKey: ["getAllContents"],
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
    const previewUrlsForContent = previewUrls.get(event.content.id);
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
      <div className="flex flex-col gap-2 overflow-scroll">
        <RadioGroup
          disabled={isJobPending(idbKey)}
          value={selectedDesign}
          onValueChange={(value) => setSelectedDesign(value as "current" | "new")}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div
              className="cursor-pointer"
              onClick={() => {
                if (!isJobPending(idbKey)) {
                  setSelectedDesign("current");
                }
              }}
            >
              {event.hasDataChanged && (
                <div className="mb-2 flex items-center gap-2 ">
                  <RadioGroupItem value="current" />
                  <p className="text-sm font-medium">Current</p>
                </div>
              )}
              {design}
              <EditableCaption initialCaption={currCaption} onSave={setCurrCaption} />
            </div>

            {event.data && content.template && event.hasDataChanged && (
              <div
                className="cursor-pointer"
                onClick={() => {
                  if (!isJobPending(idbKey)) {
                    setSelectedDesign("new");
                  }
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
                  caption={newCaption}
                  onCaptionChange={setNewCaption}
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </div>
    );
  };

  const renderPublishDateTime = () => {
    return (
      <div>
        <p className="mb-2 text-sm font-medium">Publish date time</p>
        <Tooltip>
          <TooltipTrigger>
            <DateTimePicker
              value={{
                date: publishDateTime.date,
                hasTime: true,
              }}
              disablePastDateTime
              className={cn(
                "mb-2 h-[32px] w-full min-w-0 rounded-md px-3",
                publishDateTime.error && "border-2 border-red-500",
              )}
              onChange={(dateTime) => {
                setPublishDateTime({
                  date: dateTime.date,
                  error: dateTime.error,
                });
              }}
            />
          </TooltipTrigger>
          <TooltipContent
            autoFocus={false}
            side="right"
            className="mb-3" // because the date picker intrinsicly has some margin bottom
          >
            {publishDateTime.error ? (
              <p className="text-xs text-red-500">{publishDateTime.error}</p>
            ) : (
              `Update date time to reschedule`
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="flex h-[95dvh] flex-col items-center">
        <SheetHeader>
          <SheetTitle>
            <Header2 title={content.template?.name ?? "Untitled"} />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-2 overflow-scroll">
          {event.hasDataChanged && (
            <p className="mb-4 text-sm text-orange-400">
              The schedule data has changed. Reschedule to publish the newly generated content.
            </p>
          )}
          {renderPublishDateTime()}
          {renderEventContent()}
        </div>
        <SheetFooter>
          <Button
            onClick={handleRescheduleEvent}
            disabled={
              isRescheduling ||
              !!publishDateTime.error ||
              ((isJobPending(idbKey) || isRescheduling || isDeleting || !publishDateChanged) &&
                selectedDesign === "current" &&
                currCaption === content.ig_caption)
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
