import { InstagramTag } from "../libs/designs/photopea/utils";
import { DestinationTypes } from "./destinations";

export enum ContentType {
  InstagramPost = "Instagram Post",
  InstagramStory = "Instagram Story",
}

// Metadata at the content level
export type ContentMetadata = IgContentMetadata;
export type IgContentMetadata = {
  schedule_range_start: string;
  schedule_range_end: string;
  ig_caption: string;
};

export enum ContentItemType {
  AutoGenDesign = "Auto-generated design",
  DriveFile = "Drive file",
}

// Metadata at the individual content item level
export type ContentItemMetadata = IgContentItemMetadata;
export type IgContentItemMetadata = {
  ig_tags: InstagramTag[];
};

export const CONTENT_TYPES_BY_DESTINATION_TYPE: { [key: string]: string[] } = {
  [DestinationTypes.Instagram]: [ContentType.InstagramPost, ContentType.InstagramStory],
};
