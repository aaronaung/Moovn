import { useEmailEditor } from "@/src/contexts/email-editor";
import { useRef } from "react";

import ReactEmailEditor, { EditorRef, EmailEditorProps } from "react-email-editor";
import EditorHeader from "./editor-header";
import { useTheme } from "next-themes";

export default function EmailEditor() {
  const { close } = useEmailEditor();
  const { theme } = useTheme();
  const emailEditorRef = useRef<EditorRef>(null);

  const exportHtml = () => {
    const unlayer = emailEditorRef.current?.editor;

    unlayer?.exportHtml((data) => {
      const { design, html } = data;
      console.log("exportHtml", html);
    });
  };

  const onReady: EmailEditorProps["onReady"] = (unlayer) => {
    // editor is ready
    // you can load your template here;
    // the design json can be obtained by calling
    // unlayer.loadDesign(callback) or unlayer.exportHtml(callback)
    // const templateJson = { DESIGN JSON GOES HERE };
    // unlayer.loadDesign(templateJson);
  };

  return (
    <div className="h-screen">
      <EditorHeader
        initialTitle="Email Editor"
        onClose={close}
        onSave={exportHtml}
        isSaving={false}
      />

      <ReactEmailEditor
        ref={emailEditorRef}
        onReady={onReady}
        minHeight={`100vh`}
        options={{
          className: "h-screen",
          appearance: {
            theme: theme === "dark" ? "dark" : "light",
          },
        }}
      />
    </div>
  );
}
