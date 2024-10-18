"use client";
import { cn } from "@/src/utils";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Tables } from "@/types/db";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { ContentType } from "@/src/consts/content";
import { Button } from "@/src/components/ui/button";
import { AddTemplateItemSheet } from "./add-template-item-sheet";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { deleteTemplateItem, setTemplateItemOrder } from "@/src/data/templates";
import { Card, CardContent } from "@/src/components/ui/card";
import _ from "lodash";

export const TemplateDetails = ({
  user,
  template,
}: {
  user: Tables<"users">;
  template: Tables<"templates">;
}) => {
  // TODO: IF TEMPLATE ITEMS ARE NOT IN IDB, FETCH THEM FROM SUPABASE
  const [templateItems, setTemplateItems] = useState<CarouselItem[]>([]);
  const [addItemSheetState, setAddTemplateItemSheetState] = useState<{
    isOpen: boolean;
    position: number;
  }>({
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

  const idbTemplateItems = useLiveQuery(async () => {
    return db.templateItems.where("template_id").equals(template.id).toArray();
  }, [template]);

  useEffect(() => {
    if (idbTemplateItems) {
      setTemplateItems(
        idbTemplateItems
          .map((t) => ({
            id: t.key,
            imageUrl: URL.createObjectURL(new Blob([t.jpg ?? ""], { type: "image/jpeg" })),
            contentType: template.content_type as ContentType,
            position: t.position,
          }))
          .sort((a, b) => a.position - b.position),
      );
    }
  }, [idbTemplateItems, template]);

  const debouncedSetTemplateItemOrder = useCallback(
    _.debounce((items: CarouselItem[]) => {
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
    setAddTemplateItemSheetState({
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

  return (
    <div
      className={cn(
        "flex space-x-3 overflow-x-auto p-4",
        templateItems.length === 0 && "flex-col items-center justify-center",
      )}
    >
      <AddTemplateItemSheet
        isOpen={addItemSheetState.isOpen}
        itemPosition={addItemSheetState.position}
        user={user}
        parentTemplate={template}
        onClose={() =>
          setAddTemplateItemSheetState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        onAddComplete={(newTemplateItem) => {
          if (addItemSheetState.position !== undefined) {
            setTemplateItems((prevTemplateItems) => {
              const newTemplateItems = [...prevTemplateItems];

              newTemplateItems.splice(addItemSheetState.position, 0, {
                id: newTemplateItem.id,
              });
              _setTemplateItemOrder(
                newTemplateItems.map((item, index) => ({ id: item.id, position: index })),
              );
              return newTemplateItems;
            });
          }
          setAddTemplateItemSheetState((prev) => ({
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
          key={item.id}
          item={item}
          position={position}
          moveItem={moveItem}
          addItem={addItem}
          removeItem={removeItem}
        />
      ))}
    </div>
  );
};

type CarouselItem = {
  id: string;
};
const DraggableTemplateItem = ({
  item,
  position,
  moveItem,
  addItem,
  removeItem,
}: {
  item: CarouselItem;
  position: number;
  moveItem: (dragId: string, hoverId: string) => void;
  addItem: (position: number) => void;
  removeItem: (id: string) => void;
}) => {
  const idbTemplateItem = useLiveQuery(async () => {
    const idbTemplateItem = await db.templateItems.get(item.id);
    if (!idbTemplateItem) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([idbTemplateItem.jpg ?? ""], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(
        new Blob([idbTemplateItem.psd ?? ""], { type: "image/vnd.adobe.photoshop" }),
      ),
      psd: idbTemplateItem.psd,
    };
  });

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

  const renderAddTemplateItemBtn = (position: number) => {
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
      {position === 0 && renderAddTemplateItemBtn(position)}
      <Card
        ref={ref}
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: "move",
          border: isOver ? "2px solid blue" : "2px solid white",
        }}
        className="relative h-[350px] w-64 flex-shrink-0"
        onMouseEnter={() => setShowButtons(true)}
        onMouseLeave={() => setShowButtons(false)}
      >
        <CardContent>
          <Image
            src={idbTemplateItem?.jpgUrl ?? ""}
            alt={`carousel item ${item.id}`}
            width={500}
            height={300}
          />
          {showButtons && !isDragging && (
            <Button
              className="absolute right-2 top-2 rounded-full bg-red-500 p-3 text-white hover:bg-red-600"
              onClick={() => removeItem(item.id)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
      {renderAddTemplateItemBtn(position + 1)}
    </>
  );
};
