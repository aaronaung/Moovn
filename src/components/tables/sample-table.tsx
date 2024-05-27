import { Tables } from "@/types/db.extension";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  AccessorFnColumnDef,
  Row,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { useMemo } from "react";
import { RowAction } from "./types";

const columnHelper = createColumnHelper<Tables<"questions">>();

type QuestionsTableProp = {
  data: Tables<"questions">[];
  onRowAction: (row: Row<Tables<"questions">>, action: RowAction) => void;
};

export default function QuestionsTable({
  data,
  onRowAction,
}: QuestionsTableProp) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "",
        enableHiding: true,
      }),
      columnHelper.accessor("question", {
        header: "Question",
      }),
      columnHelper.accessor("required", {
        header: "Required",
        cell: ({ row }) => (row.getValue("required") ? "Yes" : "No"),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ row }) => row.getValue("type") || "Unknown",
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return (
            <div className="flex gap-x-3">
              <PencilSquareIcon
                onClick={() => {
                  onRowAction(row, RowAction.EDIT);
                }}
                className="h-5 w-5 cursor-pointer rounded-full text-secondary-foreground hover:bg-secondary"
              />
              <TrashIcon
                onClick={() => {
                  onRowAction(row, RowAction.DELETE);
                }}
                className=" h-5 w-5 cursor-pointer rounded-full text-destructive hover:bg-secondary"
              />
            </div>
          );
        },
      }),
    ],
    [onRowAction],
  );

  return (
    <DataTable
      initialState={{
        columnVisibility: {
          id: false,
        },
      }}
      columns={columns as AccessorFnColumnDef<Tables<"questions">>[]}
      data={data}
    />
  );
}
