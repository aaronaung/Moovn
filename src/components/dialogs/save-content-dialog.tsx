// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
// import SaveContentForm, { SaveContentFormSchemaType } from "../forms/save-content-form";
// import { Tables } from "@/types/db";
// import { useState } from "react";
// import dynamic from "next/dynamic";

// const ImageViewer = dynamic(() => import("react-viewer"), {
//   ssr: false,
// });

// export function SaveContentDialog({
//   initFormValues,
//   destination,
//   availableSources,
//   onClose,
//   isOpen,
// }: {
//   initFormValues?: SaveContentFormSchemaType;
//   destination: Tables<"destinations">;
//   availableSources: Tables<"sources">[];
//   onClose: () => void;
//   isOpen: boolean;
// }) {
//   const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
//   const [imageViewerImage, setImageViewerImage] = useState("");

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <ImageViewer
//         visible={isImageViewerOpen}
//         onMaskClick={() => {
//           setIsImageViewerOpen(false);
//         }}
//         images={[{ src: imageViewerImage, alt: "Design" }]}
//         onClose={() => setIsImageViewerOpen(false)}
//       />
//       <DialogContent
//         className="sm:min-w-[680px]"
//         onInteractOutside={(e) => {
//           e.preventDefault();
//           if (isImageViewerOpen) {
//             setIsImageViewerOpen(false);
//           } else {
//             onClose();
//           }
//         }}
//       >
//         <DialogHeader>
//           <DialogTitle>{initFormValues?.id ? "Update" : "Create"} content</DialogTitle>
//         </DialogHeader>
//         <SaveContentForm
//           destination={destination}
//           availableSources={availableSources}
//           defaultValues={initFormValues}
//           onSubmitted={onClose}
//           onImageViewerOpen={(imageUrl: string) => {
//             setIsImageViewerOpen(true);
//             setImageViewerImage(imageUrl);
//           }}
//         />
//       </DialogContent>
//     </Dialog>
//   );
// }
