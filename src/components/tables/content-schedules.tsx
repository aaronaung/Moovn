import { AccessorFnColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { useMemo } from "react";
import { Tables } from "@/types/db";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { cn } from "@/src/utils";
import { ContentPublishStatus } from "@/src/consts/destinations";
import ReactJson from "react-json-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState } from "react";

const columnHelper = createColumnHelper<Tables<"content_schedules">>();

type ContentSchedulesTableProps = {
  data: Tables<"content_schedules">[];
};

export default function ContentSchedulesTable({ data }: ContentSchedulesTableProps) {
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Schedule Name",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("schedule_expression", {
        header: "Scheduled datetime",
        cell: ({ getValue }) => {
          const scheduleExpression = getValue();
          if (!scheduleExpression) return "-";
          try {
            // Extract date from at(...) format
            const dateStr = scheduleExpression.match(/at\((.*?)\)/)?.[1];
            if (!dateStr) return scheduleExpression;

            const date = new Date(dateStr + "Z");
            return format(date, "MMM d, yyyy hh:mm aa");
          } catch (e) {
            return scheduleExpression;
          }
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge
              className={cn(
                status === ContentPublishStatus.Published && "bg-green-500",
                status === ContentPublishStatus.Failed && "bg-red-500",
                status === ContentPublishStatus.Pending && "bg-blue-500",
              )}
            >
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("published_at", {
        header: "Published At",
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? format(new Date(date), "MMM d, yyyy hh:mm aa") : "-";
        },
      }),
      columnHelper.accessor("result", {
        header: "Result",
        cell: ({ getValue }) => {
          const result = getValue();
          if (!result) return null;
          return (
            <button
              onClick={() => setSelectedResult(result)}
              className="text-sm text-blue-500 hover:underline"
            >
              View Result
            </button>
          );
        },
      }),
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns as AccessorFnColumnDef<Tables<"content_schedules">>[]}
        data={data}
      />

      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Result</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <ReactJson
              src={selectedResult}
              displayDataTypes={false}
              name={false}
              theme={"chalk"}
              style={{
                padding: 16,
                borderRadius: 8,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
