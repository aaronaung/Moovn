"use client";

import { PropsWithChildren } from "react";
import { DndProvider } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { isMobile } from "react-device-detect";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function ReactDnDProvider({ children }: PropsWithChildren) {
  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      {children}
    </DndProvider>
  );
}
