import { env } from "@/env.mjs";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { MindbodyLogo } from "@/src/components/ui/icons/mindbody";
import { Pike13Logo } from "@/src/components/ui/icons/pike13";
import { SourceTypes } from "@/src/consts/sources";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { ArrowPathIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

const getMindbodyOAuthUrl = (
  sourceId: string,
) => `https://signin.mindbodyonline.com/connect/authorize?
response_mode=form_post&
response_type=code%20id_token&
client_id=${env.NEXT_PUBLIC_MINDBODY_CLIENT_ID}&
redirect_uri=${window.location.origin}/api/auth/mindbody/callback?source_id=${sourceId}&
scope=email profile openid offline_access Mindbody.Api.Public.v6
`;

export const SourceSelectItem = ({
  isSelected,
  source,
  setSelectedSource,
  setSourceDialogState,
  setDeleteConfirmationDialogState,
}: {
  isSelected: boolean;
  source: Tables<"sources">;
  setSelectedSource: (source: Tables<"sources">) => void;
  setSourceDialogState: (state: { isOpen: boolean; source?: Tables<"sources"> }) => void;
  setDeleteConfirmationDialogState: (state: {
    isOpen: boolean;
    source?: Tables<"sources">;
  }) => void;
}) => {
  const renderLogo = () => {
    switch (source.type) {
      case SourceTypes.Pike13:
        return <Pike13Logo />;
      case SourceTypes.Mindbody:
        return <MindbodyLogo className="w-[180px]" />;
      default:
        return <></>;
    }
  };

  return (
    <div
      key={source.id}
      className={cn(
        "relative flex h-[220px] min-w-[350px] cursor-pointer flex-col gap-2 rounded-md px-4 pb-4 pt-2 hover:bg-secondary",
        isSelected && "bg-secondary",
      )}
      onClick={() => {
        setSelectedSource(source);
      }}
    >
      <div className="flex items-center ">
        <Checkbox id={source.id} className="mr-2" checked={isSelected} />
        <label htmlFor={source.id} id="source-checkbox" className="flex-1 text-sm">
          {source.name}
        </label>
        <div className="mb-1 flex gap-x-0.5">
          <PencilSquareIcon
            onClick={() => {
              setSourceDialogState({
                isOpen: true,
                source,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
          />
          <TrashIcon
            onClick={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                source,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground hover:text-secondary"
          />
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary-foreground p-8">
        {renderLogo()}
      </div>
      {source.type === SourceTypes.Mindbody && (
        <Button
          className="rounded-md"
          onClick={() => {
            console.log(getMindbodyOAuthUrl(source.id));
            window.location.href = getMindbodyOAuthUrl(source.id);
          }}
        >
          <ArrowPathIcon className="mr-2 h-5 w-5 " /> Connect
        </Button>
      )}
    </div>
  );
};
