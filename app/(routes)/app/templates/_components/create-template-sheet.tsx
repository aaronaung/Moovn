import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import InputSelect from "@/src/components/ui/input/select";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { toast } from "@/src/components/ui/use-toast";
import { ContentType } from "@/src/consts/content";
import { LEARN_TEMPLATE_CREATION_GUIDE_LINK } from "@/src/consts/links";
import { SourceDataView } from "@/src/consts/sources";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { uploadObject } from "@/src/data/r2";
import { saveTemplate } from "@/src/data/templates";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { Tables } from "@/types/db";
import { useEffect, useState } from "react";

export default function CreateTemplateSheet({
  user,
  isOpen,
  onClose,
}: {
  user: Tables<"users">;
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    open: openPhotopeaEditor,
    close,
    freeDesignTemplates,
    blankDesignTemplates,
  } = usePhotopeaEditor();
  const [sourceDataView, setSourceDataView] = useState(SourceDataView.Daily);
  const [contentType, setContentType] = useState(ContentType.InstagramPost);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<string | undefined>(undefined);

  const { mutateAsync: _saveTemplate, isPending: isSavingTemplate } = useSupaMutation(
    saveTemplate,
    {
      invalidate: [["getTemplatesForAuthUser"]],
    },
  );

  const getSelectedTemplate = () => {
    if (!selectedTemplateIndex) {
      return blankDesignTemplates[contentType];
    }
    return (
      freeDesignTemplates?.[sourceDataView]?.[contentType]?.[parseInt(selectedTemplateIndex)].psd ??
      blankDesignTemplates[contentType] ??
      new ArrayBuffer(0)
    );
  };

  const handleTemplateCreate = async (
    designExport: DesignExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
  ) => {
    if (!designExport["psd"] || !designExport["jpg"]) {
      console.error("missing psd or jpg file in export:", {
        designExport,
      });
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support.",
      });
      return;
    }

    try {
      const saved = await _saveTemplate({
        name: metadataChanges.title,
        source_data_view: metadataChanges.source_data_view,
        content_type: metadataChanges.content_type,
        owner_id: user.id,
      });
      const templatePath = `${user.id}/${saved.id}`;

      await Promise.all([
        db.templates.put({
          key: templatePath,
          templateId: saved.id,
          jpg: designExport["jpg"],
          psd: designExport["psd"],
          lastUpdated: new Date(),
        }),
        uploadObject("templates", templatePath, new Blob([designExport["psd"]])),
      ]);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support",
      });
    } finally {
      close();
    }

    toast({
      variant: "success",
      title: "Template saved",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="flex h-[95dvh] flex-col ">
        <SheetHeader>
          <SheetTitle>Create Template</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-scroll">
          <SelectMetadataSection
            sourceDataView={sourceDataView}
            setSourceDataView={setSourceDataView}
            contentType={contentType}
            setContentType={setContentType}
          />
          <SelectStartingTemplateSection
            sourceDataView={sourceDataView}
            contentType={contentType}
            selectedTemplateIndex={selectedTemplateIndex}
            onTemplateSelect={setSelectedTemplateIndex}
          />
          <TemplateCreationGuideSection />
        </div>
        <SheetFooter>
          <Button
            size="lg"
            onClick={() => {
              openPhotopeaEditor(
                {
                  title: "Untitled",
                  source_data_view: sourceDataView,
                  content_type: contentType,
                },
                getSelectedTemplate(),
                {
                  onSave: handleTemplateCreate,
                  isMetadataEditable: true,
                },
              );
            }}
          >
            Start editor
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const SelectMetadataSection = ({
  sourceDataView,
  setSourceDataView,
  contentType,
  setContentType,
}: {
  sourceDataView: SourceDataView;
  setSourceDataView: (value: SourceDataView) => void;
  contentType: ContentType;
  setContentType: (value: ContentType) => void;
}) => {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Select the type of content and schedule you want to use for this template. You can then edit
        the template in the editor.
      </p>
      <div className="mx-1 mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <InputSelect
          value={sourceDataView}
          className="w-[200px]"
          options={Object.keys(SourceDataView).map((key) => ({
            // @ts-ignore
            label: SourceDataView[key],
            // @ts-ignore
            value: SourceDataView[key],
          }))}
          onChange={(value) => {
            setSourceDataView(value);
          }}
          label="Schedule type"
        />
        <InputSelect
          value={contentType}
          className="w-[250px]"
          options={Object.keys(ContentType).map((key) => ({
            // @ts-ignore
            label: ContentType[key],
            // @ts-ignore
            value: ContentType[key],
          }))}
          onChange={(value) => {
            setContentType(value);
          }}
          label="Content type"
        />
      </div>
    </div>
  );
};

const SelectStartingTemplateSection = ({
  sourceDataView,
  contentType,
  selectedTemplateIndex,
  onTemplateSelect,
}: {
  sourceDataView: SourceDataView;
  contentType: ContentType;
  selectedTemplateIndex: string | undefined;
  onTemplateSelect: (templateIndex: string | undefined) => void;
}) => {
  const { isLoadingFreeDesignTemplates, freeDesignTemplates } = usePhotopeaEditor();
  useEffect(() => {
    onTemplateSelect(undefined);
  }, [sourceDataView, contentType, onTemplateSelect]);

  return (
    <div>
      <h3 className="text-sm text-muted-foreground">Select a starter template</h3>
      {!isLoadingFreeDesignTemplates ? (
        <RadioGroup value={selectedTemplateIndex} onValueChange={onTemplateSelect}>
          <div className="mt-3 flex flex-wrap gap-4">
            {(freeDesignTemplates[sourceDataView][contentType] || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Starter templates coming soon!</p>
            )}

            {(freeDesignTemplates[sourceDataView][contentType] || []).map((template, index) => (
              <div className="flex flex-col gap-2" key={index}>
                <RadioGroupItem value={`${index}`} />
                <img
                  src={`data:image/jpeg;base64,${Buffer.from(template.jpg).toString("base64")}`}
                  className="w-[150px] cursor-pointer rounded-md object-cover sm:w-[200px]"
                  onClick={() => {
                    onTemplateSelect(`${index}`);
                  }}
                  alt={`Template ${index}`}
                />
              </div>
            ))}
          </div>
        </RadioGroup>
      ) : (
        <Spinner />
      )}
    </div>
  );
};

const TemplateCreationGuideSection = () => {
  return (
    <div>
      <h3 className="mb-3 mt-8 font-semibold">Template creation guides & resources</h3>
      <ul className="list-disc pl-4">
        <li>
          <a
            href={LEARN_TEMPLATE_CREATION_GUIDE_LINK}
            className="text-sm text-primary hover:underline"
            target="_blank"
          >
            Learn how Moovn&apos;s templating engine generates designs.
          </a>
        </li>
      </ul>
    </div>
  );
};
