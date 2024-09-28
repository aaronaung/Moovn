import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FileDropzone from "@/src/components/ui/input/file-dropzone";
import InputSelect from "@/src/components/ui/input/select";
import InputTextArea from "@/src/components/ui/input/textarea";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { toast } from "@/src/components/ui/use-toast";
import { ContentType } from "@/src/consts/content";
import { LEARN_TEMPLATE_CREATION_GUIDE_LINK } from "@/src/consts/links";
import { SourceDataView } from "@/src/consts/sources";
import { TemplateCreationRequestStatus } from "@/src/consts/templates";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { moveObject, uploadObject } from "@/src/data/r2";
import { saveTemplate, saveTemplateCreationRequest } from "@/src/data/templates";
import { useGenerateTemplateJpg } from "@/src/hooks/use-generate-template-jpg";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { useTemplateStorageObjects } from "@/src/hooks/use-template-storage-objects";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { Tables } from "@/types/db";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

enum TemplateCreator {
  Moovn = "moovn",
  Self = "self",
}

export default function CreateTemplateSheet({
  user,
  isOpen,
  onClose,
  parentTemplate,
  title,
}: {
  user: Tables<"users">;
  isOpen: boolean;
  onClose: () => void;
  parentTemplate?: Tables<"templates">; // if provided, we're adding to a carousel
  title: string;
}) {
  const {
    open: openPhotopeaEditor,
    close,
    freeDesignTemplates,
    blankDesignTemplates,
  } = usePhotopeaEditor();
  const [sourceDataView, setSourceDataView] = useState(SourceDataView.Daily);
  const [contentType, setContentType] = useState(ContentType.InstagramPost);
  const { templateObjects, isLoadingTemplateObjects } = useTemplateStorageObjects(parentTemplate);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<string | undefined>(undefined);
  const [templateCreator, setTemplateCreator] = useState(TemplateCreator.Moovn);
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const { generateTemplateJpgSync } = useGenerateTemplateJpg();

  const { mutateAsync: _saveTemplate } = useSupaMutation(saveTemplate, {
    invalidate: [["getTemplatesForAuthUser"]],
  });
  const { mutateAsync: _saveTemplateCreationRequest } = useSupaMutation(
    saveTemplateCreationRequest,
    {
      invalidate: [["getTemplatesForAuthUser"]],
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

  const handleAddToCarousel = async (designExport: DesignExport) => {
    if (!parentTemplate) {
      return;
    }
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
      let templatePathForNew;
      if (templateObjects.length > 1) {
        templatePathForNew = `${parentTemplate.owner_id}/${parentTemplate.id}/${templateObjects.length}`;

        await uploadObject("templates", templatePathForNew, new Blob([designExport["psd"]]));
      } else {
        templatePathForNew = `${templateObjects[0].path}/1`;
        // Delete the old template and design in idb.
        await Promise.all([
          db.designs.where("templateId").equals(parentTemplate.id).delete(),
          db.templates.where("templateId").equals(parentTemplate.id).delete(),
          moveObject(
            "templates",
            templateObjects[0].path,
            "templates",
            `${templateObjects[0].path}/0`,
          ),
          uploadObject("templates", templatePathForNew, new Blob([designExport["psd"]])),
          db.templates.put({
            key: templatePathForNew,
            templateId: parentTemplate.id,
            jpg: designExport["jpg"],
            psd: designExport["psd"],
            lastUpdated: new Date(),
          }),
          _saveTemplate({
            id: parentTemplate.id,
            is_carousel: true,
          }),
        ]);
      }
      toast({
        variant: "success",
        title: `Carousel template saved.`,
      });
      close();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support.",
      });
    }
  };

  const handleTemplateCreate = async (
    designExport: DesignExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
    isCreationRequest: boolean = false,
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
      const saved = await _saveTemplate({
        name: metadataChanges.title,
        source_data_view: metadataChanges.source_data_view,
        content_type: metadataChanges.content_type,
        owner_id: user.id,
        is_carousel: false,
      });

      if (isCreationRequest) {
        await _saveTemplateCreationRequest({
          owner_id: user.id,
          template_id: saved.id,
          status: TemplateCreationRequestStatus.InProgress,
          description: templateDescription,
        });
      }

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

      toast({
        variant: "success",
        title: "Template saved",
      });
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

  const handleCreateClick = async () => {
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
          templatePath: uuidv4(), // This is a unique path for the template. It's not used for storage, but just for the generation process.
          templateData: psd,
        });
        const templatePsdAndJpg = {
          psd,
          jpg,
        };

        if (parentTemplate) {
          await handleAddToCarousel(templatePsdAndJpg);
        } else {
          await handleTemplateCreate(
            templatePsdAndJpg,
            {
              title: templateFile.name,
              source_data_view: sourceDataView,
              content_type: contentType,
            },
            true,
          );
        }

        onClose();
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
          onSave: parentTemplate ? handleAddToCarousel : handleTemplateCreate,
          isMetadataEditable: !Boolean(parentTemplate), // Disable editing metadata if we're adding to a carousel
        },
      );
    }
  };

  const clearState = () => {
    setTemplateFile(null);
    setTemplateDescription("");
    setSelectedTemplateIndex(undefined);
    setTemplateCreator(TemplateCreator.Moovn);
    setSourceDataView(SourceDataView.Daily);
    setContentType(ContentType.InstagramPost);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="flex h-[95dvh] flex-col ">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-scroll p-1">
          <SelectMetadataSection
            sourceDataView={sourceDataView}
            setSourceDataView={setSourceDataView}
            contentType={contentType}
            setContentType={setContentType}
          />
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
          <Button size="lg" onClick={handleCreateClick} disabled={isUploadingTemplate}>
            {templateCreator === TemplateCreator.Self ? (
              "Start editor"
            ) : (
              <>{isUploadingTemplate ? <Spinner /> : "Ask Moovn"}</>
            )}
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
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
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
      <p className="mb-4 text-sm text-muted-foreground">
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
          <TabsTrigger value={TemplateCreator.Moovn}>Ask Moovn</TabsTrigger>
          <TabsTrigger value={TemplateCreator.Self}>Do it yourself</TabsTrigger>
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
          <h3 className="text-sm text-muted-foreground">Select a starter template</h3>
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

                    <img
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
