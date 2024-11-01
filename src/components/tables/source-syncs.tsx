import { AccessorFnColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { useMemo, useState } from "react";
import { Tables } from "@/types/db";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { SourceSyncStatus } from "@/src/consts/sources";
import { cn } from "@/src/utils";
import ReactJson from "react-json-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const columnHelper = createColumnHelper<Tables<"source_syncs">>();

type SourceSyncsTableProps = {
  data: Tables<"source_syncs">[];
};

export default function SourceSyncsTable({ data }: SourceSyncsTableProps) {
  const [selectedErrors, setSelectedErrors] = useState<any[] | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("created_at", {
        header: "Sync Date",
        cell: ({ getValue }) => format(new Date(getValue()), "MMM d, yyyy hh:mm aa"),
      }),
      columnHelper.accessor("duration_ms", {
        header: "Duration",
        cell: ({ row }) => {
          const status = row.getValue("status");
          if (status === SourceSyncStatus.InProgress) return null;
          const duration: number = row.getValue("duration_ms");
          return `${((duration ?? 0) / 1000).toFixed(2)}s`;
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge
              className={cn(
                status === SourceSyncStatus.Success && "bg-green-500",
                status === SourceSyncStatus.Failed && "bg-red-500",
                status === SourceSyncStatus.InProgress && "bg-blue-500",
              )}
            >
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("errors", {
        header: "Errors",
        cell: ({ getValue }) => {
          const errors = getValue();
          if (!errors) return null;
          return (
            <button
              onClick={() => setSelectedErrors(errors as any[])}
              className="text-sm text-red-500 hover:underline"
            >
              View Errors
            </button>
          );
        },
      }),
    ],
    [],
  );

  return (
    <>
      <DataTable columns={columns as AccessorFnColumnDef<Tables<"source_syncs">>[]} data={data} />

      <Dialog open={!!selectedErrors} onOpenChange={() => setSelectedErrors(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Errors</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedErrors?.map((error, index) => (
              <div key={index} className="mb-4">
                <ReactJson
                  src={error}
                  displayDataTypes={false}
                  name={false}
                  theme={"chalk"}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                  }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
