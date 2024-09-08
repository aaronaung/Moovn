import { DestinationTypes } from "./destinations";

export enum ContentType {
  InstagramPost = "Instagram Post",
  InstagramStory = "Instagram Story",
}

export const CONTENT_TYPES_BY_DESTINATION_TYPE: { [key: string]: string[] } = {
  [DestinationTypes.Instagram]: [ContentType.InstagramPost, ContentType.InstagramStory],
};
