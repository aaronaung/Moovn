import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FileDropzone from "@/src/components/ui/input/file-dropzone";
import InputTextArea from "@/src/components/ui/input/textarea";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { toast } from "@/src/components/ui/use-toast";
import { ContentType } from "@/src/consts/content";
import { LEARN_TEMPLATE_CREATION_GUIDE_LINK } from "@/src/consts/links";
import { SourceDataView } from "@/src/consts/sources";
import { TemplateCreationRequestStatus } from "@/src/consts/templates";
import { ContentItemType } from "@/src/consts/content";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { uploadObject } from "@/src/data/r2";
import {
  saveTemplate,
  saveTemplateItem,
  saveTemplateItemDesignRequest,
} from "@/src/data/templates";
import { useGenerateTemplateJpg } from "@/src/hooks/use-generate-template-jpg";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { Tables } from "@/types/db";
import Image from "next/image";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";
import { SheetFooter } from "@/src/components/ui/sheet";

enum TemplateCreator {
  Moovn = "moovn",
  Self = "self",
}

export default function AddAutoGenDesignTemplateItem({
  user,
  parentTemplate,
  itemPosition,
  onAddComplete,
  sourceDataView,
  contentType,
}: {
  user: Tables<"users">;
  parentTemplate?: Tables<"templates">; // if provided, we're adding to a carousel
  itemPosition: number;
  onAddComplete: (newTemplateItem: Tables<"template_items">) => void;
  sourceDataView: SourceDataView;
  contentType: ContentType;
}) {
  const {
    open: openPhotopeaEditor,
    close,
    freeDesignTemplates,
    blankDesignTemplates,
  } = usePhotopeaEditor();

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<string | undefined>(undefined);
  const [templateCreator, setTemplateCreator] = useState(TemplateCreator.Self);
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const { generateTemplateJpgSync } = useGenerateTemplateJpg();

  const { mutateAsync: _saveTemplate } = useSupaMutation(saveTemplate, {
    invalidate: [["getAllTemplates"]],
  });
  const { mutateAsync: _saveTemplateItem } = useSupaMutation(saveTemplateItem, {
    invalidate: [["getTemplateItemsByTemplateId", parentTemplate?.id ?? ""]],
  });
  const { mutateAsync: _saveTemplateItemDesignRequest } = useSupaMutation(
    saveTemplateItemDesignRequest,
    {
      invalidate: [["getAllTemplates"]],
    },
  );

  const onFileDrop = (file: File) => {
    console.log("file", file);
    setTemplateFile(file);
  };

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
    metadata: Partial<PhotopeaEditorMetadata>,
    isDesignRequest: boolean = false,
  ): Promise<void> => {
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
      let template = parentTemplate;
      if (!template) {
        template = await _saveTemplate({
          name: metadata.title,
          source_data_view: metadata.source_data_view,
          content_type: metadata.content_type,
          owner_id: user.id,
        });
      }
      const savedTemplateItem = await _saveTemplateItem({
        template_id: template.id,
        position: itemPosition,
        type: ContentItemType.AutoGenDesign,
      });
      if (isDesignRequest) {
        await _saveTemplateItemDesignRequest({
          owner_id: user.id,
          template_item_id: savedTemplateItem.id,
          status: TemplateCreationRequestStatus.InProgress,
          description: templateDescription,
        });
      }

      const templatePath = `${user.id}/${template.id}/${savedTemplateItem.id}`;
      await Promise.all([
        db.templateItems.put({
          key: savedTemplateItem.id,
          type: ContentItemType.AutoGenDesign,
          position: itemPosition,
          template_id: template.id,
          jpg: designExport["jpg"],
          psd: designExport["psd"],
          updated_at: new Date(),
          created_at: new Date(),
        }),
        uploadObject("templates", templatePath, new Blob([designExport["psd"]])),
      ]);

      toast({
        variant: "success",
        title: "Template saved",
      });
      onAddComplete(savedTemplateItem);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support",
      });
    } finally {
      close();
    }
  };

  const handleAddTemplateItem = async () => {
    if (templateCreator === TemplateCreator.Moovn) {
      if (!templateFile) {
        toast({
          variant: "destructive",
          title: "Please upload a template file.",
        });
        return;
      }

      try {
        setIsUploadingTemplate(true);
        const psd = await templateFile.arrayBuffer();
        const jpg = await generateTemplateJpgSync({
          id: uuidv4(), // This is a unique path for the template. It's not used for storage, but just for the generation process.
          templateData: psd,
        });
        const templatePsdAndJpg = {
          psd,
          jpg,
        };

        await handleTemplateCreate(
          templatePsdAndJpg,
          {
            title: templateFile.name,
            source_data_view: sourceDataView,
            content_type: contentType,
          },
          true,
        );

        clearState();
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploadingTemplate(false);
      }
    } else {
      openPhotopeaEditor(
        {
          title: parentTemplate?.name || "Untitled",
          source_data_view: parentTemplate?.source_data_view || sourceDataView,
          content_type: parentTemplate?.content_type || contentType,
        },
        getSelectedTemplate(),
        {
          onSave: handleTemplateCreate,
          isMetadataEditable: !Boolean(parentTemplate),
        },
      );
    }
  };

  const clearState = () => {
    setTemplateFile(null);
    setTemplateDescription("");
    setSelectedTemplateIndex(undefined);
    setTemplateCreator(TemplateCreator.Moovn);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-scroll p-1">
        <SelectTemplateCreatorSection
          sourceDataView={sourceDataView}
          contentType={contentType}
          selectedTemplateIndex={selectedTemplateIndex}
          onTemplateSelect={setSelectedTemplateIndex}
          templateCreator={templateCreator}
          setTemplateCreator={setTemplateCreator}
          templateDescription={templateDescription}
          setTemplateDescription={setTemplateDescription}
          onFileDrop={onFileDrop}
        />
        {templateCreator === TemplateCreator.Self && <TemplateCreationGuideSection />}
      </div>
      <SheetFooter>
        <Button size="lg" onClick={handleAddTemplateItem} disabled={isUploadingTemplate}>
          {templateCreator === TemplateCreator.Self ? (
            "Start editor"
          ) : (
            <>{isUploadingTemplate ? <Spinner /> : "Ask Moovn"}</>
          )}
        </Button>
      </SheetFooter>
    </>
  );
}

const SelectTemplateCreatorSection = ({
  sourceDataView,
  contentType,
  selectedTemplateIndex,
  onTemplateSelect,
  templateCreator,
  setTemplateCreator,
  templateDescription,
  setTemplateDescription,
  onFileDrop,
}: {
  sourceDataView: SourceDataView;
  contentType: ContentType;
  selectedTemplateIndex: string | undefined;
  onTemplateSelect: (templateIndex: string | undefined) => void;
  templateCreator: TemplateCreator;
  setTemplateCreator: (value: TemplateCreator) => void;
  templateDescription: string;
  setTemplateDescription: (value: string) => void;
  onFileDrop: (file: File) => void;
}) => {
  const { isLoadingFreeDesignTemplates, freeDesignTemplates } = usePhotopeaEditor();
  useEffect(() => {
    onTemplateSelect(undefined);
  }, [sourceDataView, contentType, onTemplateSelect]);

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Choose how you want to create your template. Our design team can create it for you or you
        can design it yourself.
      </p>
      <Tabs
        defaultValue={TemplateCreator.Moovn}
        value={templateCreator}
        onValueChange={(value) => {
          setTemplateCreator(value as TemplateCreator);
        }}
      >
        <TabsList className="mb-2">
          <TabsTrigger value={TemplateCreator.Self}>Do it yourself</TabsTrigger>
          <TabsTrigger value={TemplateCreator.Moovn}>Ask Moovn</TabsTrigger>
        </TabsList>
        <TabsContent value={TemplateCreator.Moovn}>
          <div>
            <div className="mt-3">
              <FileDropzone
                label="Upload your design (PSD format)"
                options={{
                  accept: {
                    "image/vnd.adobe.photoshop": [".psd"],
                  },
                  multiple: false,
                }}
                onDrop={(files) => {
                  onFileDrop(files[0]);
                }}
              />
              <InputTextArea
                className="mt-4"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                textareaProps={{
                  rows: 5,
                  placeholder:
                    "Describe your design vision and any specific details you want to include.",
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                The turnaround time to create your template is 2-3 business days.
              </p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value={TemplateCreator.Self}>
          <h3 className="text-xs text-muted-foreground">Select a starter template</h3>
          {!isLoadingFreeDesignTemplates ? (
            <RadioGroup
              value={`item-${selectedTemplateIndex}`}
              onValueChange={(value) => {
                const index = value.split("-")[1];
                onTemplateSelect(index);
              }}
            >
              <div className="mt-3 flex flex-wrap gap-4">
                {(freeDesignTemplates[sourceDataView][contentType] || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Starter templates coming soon!</p>
                )}

                {(freeDesignTemplates[sourceDataView][contentType] || []).map((template, index) => (
                  <div className="flex flex-col gap-2" key={index}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={`item-${index}`} />
                      <p
                        className="w-[180px] cursor-pointer text-xs font-semibold"
                        onClick={() => {
                          onTemplateSelect(`${index}`);
                        }}
                      >
                        {template.title}
                      </p>
                    </div>

                    <Image
                      style={{
                        boxShadow:
                          selectedTemplateIndex === index.toString()
                            ? "0 0 0 2px #4CAF50"
                            : "none" /* emulate the border */,
                      }}
                      src={`data:image/jpeg;base64,${Buffer.from(template.jpg).toString("base64")}`}
                      className="w-[150px] cursor-pointer rounded-md object-cover sm:w-[200px]"
                      onClick={() => {
                        onTemplateSelect(`${index}`);
                      }}
                      width={isMobile ? 150 : 200}
                      height={isMobile ? 150 : 200}
                      alt={`Template ${index}`}
                    />
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <Spinner />
          )}
        </TabsContent>
      </Tabs>
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
