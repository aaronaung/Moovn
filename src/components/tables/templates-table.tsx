import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  AccessorFnColumnDef,
  Row,
  createColumnHelper,
} from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { useMemo } from "react";
import { RowAction } from "./types";
import { getTemplatesForAuthUser } from "@/src/data/templates";

export type TemplatesTableSchema = Awaited<
  ReturnType<typeof getTemplatesForAuthUser>
>[0];

const columnHelper = createColumnHelper<TemplatesTableSchema>();

type TemplatesTableProp = {
  data: TemplatesTableSchema[];
  onRowAction: (row: Row<TemplatesTableSchema>, action: RowAction) => void;
};
export default function TemplatesTable({
  data,
  onRowAction,
}: TemplatesTableProp) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "",
        enableHiding: true,
      }),
      columnHelper.accessor("name", {
        header: "Name",
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: ({ row }) => row.original.source?.type || "N/A",
      }),
      columnHelper.accessor("source_data_view", {
        header: "View",
        cell: ({ row }) => row.original.source_data_view || "N/A",
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
      columns={columns as AccessorFnColumnDef<TemplatesTableSchema>[]}
      data={data}
    />
  );
}
