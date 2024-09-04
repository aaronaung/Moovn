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
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { deleteContentSchedule } from "@/src/data/content";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";

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
  const { mutate: _deleteContentSchedule, isPending: isDeleting } = useSupaMutation(
    deleteContentSchedule,
    {
      invalidate: [["getContentSchedules"], ["getContentsForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Content schedule deleted.",
          variant: "success",
        });
        onClose();
      },
      onError: (err) => {
        console.error(err);
        toast({
          title: "Failed to delete content schedule.",
          variant: "destructive",
        });
      },
    },
  );
  const handleDeleteEvent = async () => {
    _deleteContentSchedule({
      ownerId: content.owner_id,
      contentId: content.id,
      scheduleName: event.scheduleName,
    });
  };

  const renderEventContent = () => {
    if ((event.previewUrls ?? []).length === 0) {
      return <p className="text-sm text-muted-foreground">No preview available.</p>;
    }
    if (event.previewUrls?.length === 1) {
      return (
        <DesignImageWithIGTags
          width={500}
          url={event.previewUrls[0]}
          instagramTags={(content.ig_tags as InstagramTag[][])?.[0] ?? []}
          className="rounded-md"
        />
      );
    }
    return (
      <Carousel className="w-[500px]">
        <CarouselContent>
          {event.previewUrls?.map((url, index) => (
            <CarouselItem key={url}>
              <DesignImageWithIGTags
                width={500}
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[calc(100vh_-_50px)] max-w-[calc(100vw_-_20px)] ">
        <div className="flex flex-col ">
          <Header2 title={content.template?.name ?? "Untitled"} />
          <p className="my-4 text-sm">
            Scheduled for release on {format(event.start, "MMM, do")} at{" "}
            {event.start.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {renderEventContent()}
          <p className={`max-w-[500px] whitespace-pre-wrap p-2 text-sm`}>{content.ig_caption}</p>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
            {isDeleting ? (
              <Spinner />
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
