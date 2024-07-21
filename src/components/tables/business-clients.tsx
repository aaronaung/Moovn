import { AccessorFnColumnDef, Row, createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { useMemo } from "react";
import { RowAction } from "./types";

type BusinessClient = {
  name: string;
  email: string;
};

const columnHelper = createColumnHelper<BusinessClient>();

type BusinessClientsProp = {
  data: BusinessClient[];
  onRowAction?: (row: Row<BusinessClient>, action: RowAction) => void;
};

export default function BusinessClientsTable({ data, onRowAction }: BusinessClientsProp) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        enableHiding: true,
      }),
      columnHelper.accessor("email", {
        header: "Email",
      }),

      // columnHelper.display({
      //   id: "actions",
      //   cell: ({ row }) => {
      //     return (
      //       <div className="flex gap-x-3">
      //         <PencilSquareIcon
      //           onClick={() => {
      //             onRowAction(row, RowAction.EDIT);
      //           }}
      //           className="h-5 w-5 cursor-pointer rounded-full text-secondary-foreground hover:bg-secondary"
      //         />
      //         <TrashIcon
      //           onClick={() => {
      //             onRowAction(row, RowAction.DELETE);
      //           }}
      //           className=" h-5 w-5 cursor-pointer rounded-full text-destructive hover:bg-secondary"
      //         />
      //       </div>
      //     );
      //   },
      // }),
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
      columns={columns as AccessorFnColumnDef<BusinessClient>[]}
      data={data}
    />
  );
}
