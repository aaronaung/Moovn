"use client";
import { cn } from "@/src/utils";

import { SetStateAction, Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Tables } from "@/types/db";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/src/components/ui/button";
import { SaveTemplateItemSheet } from "./save-template-item-sheet";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import {
  deleteTemplateItem,
  getTemplateItemsByTemplateId,
  setTemplateItemOrder,
} from "@/src/data/templates";
import _ from "lodash";
import { Spinner } from "@/src/components/common/loading-spinner";
import TemplateContainer from "../../_components/template-container";
import { ContentItemType } from "@/src/consts/content";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { TemplateItemMetadata } from "@/src/consts/templates";

type SaveTemplateItemSheetState = {
  isOpen: boolean;
  position: number;
  templateItem?: Tables<"template_items">;
};

export const TemplateDetails = ({
  user,
  template,
}: {
  user: Tables<"users">;
  template: Tables<"templates">;
}) => {
  const { data: initialTemplateItems, isLoading: isLoadingInitialTemplateItems } = useSupaQuery(
    getTemplateItemsByTemplateId,
    {
      arg: template.id,
      queryKey: ["getTemplateItemsByTemplateId", template.id],
    },
  );
  const [templateItems, setTemplateItems] = useState<Tables<"template_items">[]>([]);
  const [saveTemplateItemSheetState, setSaveTemplateItemSheetState] =
    useState<SaveTemplateItemSheetState>({
      isOpen: false,
      position: 1,
    });

  const { mutateAsync: _deleteTemplateItem, isPending: isDeletingTemplateItem } = useSupaMutation(
    deleteTemplateItem,
    {
      invalidate: [["getTemplateItemsByTemplateId", template.id]],
    },
  );
  const { mutateAsync: _setTemplateItemOrder } = useSupaMutation(setTemplateItemOrder, {
    invalidate: [["getTemplateItemsByTemplateId", template.id]],
  });

  useEffect(() => {
    const loadTemplateItemsIdb = async () => {
      for (const item of initialTemplateItems ?? []) {
        const inIdb = await db.templateItems.get(item.id);
        if (!inIdb) {
          await db.templateItems.put({
            key: item.id,
            position: item.position,
            template_id: item.template_id,
            type: item.type as ContentItemType,
            metadata: item.metadata as TemplateItemMetadata,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    };
    setTemplateItems(initialTemplateItems ?? []);
    loadTemplateItemsIdb();
  }, [initialTemplateItems]);

  const debouncedSetTemplateItemOrder = useCallback(
    _.debounce((items: Tables<"template_items">[]) => {
      _setTemplateItemOrder(items.map((item, index) => ({ id: item.id, position: index })));
    }, 1000),
    [_setTemplateItemOrder],
  );

  const moveItem = useCallback(
    (dragId: string, hoverId: string) => {
      setTemplateItems((prevTemplateItems) => {
        const newTemplateItems = [...prevTemplateItems];
        const draggedIndex = newTemplateItems.findIndex((item) => item.id === dragId);
        const hoverIndex = newTemplateItems.findIndex((item) => item.id === hoverId);
        const draggedTemplateItem = newTemplateItems[draggedIndex];
        newTemplateItems.splice(draggedIndex, 1);
        newTemplateItems.splice(hoverIndex, 0, draggedTemplateItem);

        debouncedSetTemplateItemOrder(newTemplateItems);

        return newTemplateItems;
      });
    },
    [debouncedSetTemplateItemOrder],
  );

  const addItem = useCallback((position: number) => {
    setSaveTemplateItemSheetState({
      isOpen: true,
      position,
    });
  }, []);

  const removeItem = useCallback(
    async (id: string) => {
      await _deleteTemplateItem(id);
      setTemplateItems((prevTemplateItems) => prevTemplateItems.filter((item) => item.id !== id));
    },
    [_deleteTemplateItem],
  );

  if (isLoadingInitialTemplateItems) {
    return <Spinner />;
  }

  return (
    <div
      className={cn(
        "flex space-x-3 overflow-x-auto p-4",
        templateItems.length === 0 && "flex-col items-center justify-center",
      )}
    >
      <SaveTemplateItemSheet
        isOpen={saveTemplateItemSheetState.isOpen}
        itemPosition={saveTemplateItemSheetState.position}
        user={user}
        parentTemplate={template}
        templateItem={saveTemplateItemSheetState.templateItem}
        onClose={() =>
          setSaveTemplateItemSheetState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        onAddComplete={(newTemplateItem) => {
          if (saveTemplateItemSheetState.position !== undefined) {
            setTemplateItems((prevTemplateItems) => {
              const newTemplateItems = [...prevTemplateItems];

              newTemplateItems.splice(saveTemplateItemSheetState.position, 0, newTemplateItem);
              _setTemplateItemOrder(
                newTemplateItems.map((item, index) => ({ id: item.id, position: index })),
              );
              return newTemplateItems;
            });
          }
          setSaveTemplateItemSheetState((prev) => ({
            ...prev,
            isOpen: false,
          }));
        }}
      />

      {templateItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-center text-sm text-muted-foreground">No template items found.</p>
          <Button onClick={() => addItem(0)}>Add template item</Button>
        </div>
      )}
      {templateItems.map((item, position) => (
        <DraggableTemplateItem
          template={template}
          key={item.id}
          item={item}
          position={position}
          moveItem={moveItem}
          addItem={addItem}
          removeItem={removeItem}
          setSaveTemplateItemSheetState={setSaveTemplateItemSheetState}
        />
      ))}
    </div>
  );
};

const DraggableTemplateItem = ({
  template,
  item,
  position,
  moveItem,
  addItem,
  removeItem,
  setSaveTemplateItemSheetState,
}: {
  template: Tables<"templates">;
  item: Tables<"template_items">;
  position: number;
  moveItem: (dragId: string, hoverId: string) => void;
  addItem: (position: number) => void;
  removeItem: (id: string) => void;
  setSaveTemplateItemSheetState: Dispatch<SetStateAction<SaveTemplateItemSheetState>>;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showButtons, setShowButtons] = useState(false);

  const [{ isOver }, drop] = useDrop({
    accept: "template-item",
    hover: (draggedItem: { id: string }, monitor) => {
      if (!ref.current) return;
      const dragId = draggedItem.id;
      const hoverId = item.id;
      if (dragId === hoverId) return;
      moveItem(dragId, hoverId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const [{ isDragging }, drag] = useDrag({
    type: "template-item",
    item: () => ({ id: item.id, position }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // This makes the template-item draggable and droppable
  drag(drop(ref));

  const renderSaveTemplateItemBtn = (position: number) => {
    return (
      <div
        onMouseEnter={() => {
          if (!isDragging) {
            setShowButtons(true);
          }
        }}
        onMouseLeave={() => setShowButtons(false)}
        className={cn(
          "flex w-10 shrink-0 items-center justify-center rounded-md opacity-0 hover:cursor-pointer hover:bg-secondary",
          showButtons && !isDragging && "opacity-100",
        )}
        onClick={() => addItem(position)}
      >
        <PlusIcon className="h-6 w-6"></PlusIcon>
      </div>
    );
  };

  return (
    <>
      {position === 0 && renderSaveTemplateItemBtn(position)}
      <div
        ref={ref}
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: "move",
          border: isOver ? "2px solid blue" : "2px solid white",
        }}
        className="relative flex-shrink-0 rounded-md"
        onMouseEnter={() => setShowButtons(true)}
        onMouseLeave={() => setShowButtons(false)}
      >
        <TemplateContainer
          template={template}
          templateItem={item}
          onEdit={
            item.type === ContentItemType.DriveFile
              ? () => {
                  setSaveTemplateItemSheetState((prev) => ({
                    ...prev,
                    isOpen: true,
                    templateItem: item,
                  }));
                }
              : undefined
          }
        />
        {showButtons && !isDragging && (
          <Button
            className="absolute right-2 top-2 rounded-full bg-red-500 p-3 text-white hover:bg-red-600"
            onClick={() => removeItem(item.id)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
      {renderSaveTemplateItemBtn(position + 1)}
    </>
  );
};
