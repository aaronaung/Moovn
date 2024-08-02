import { DestinationTypes } from "./destinations";

export enum ContentType {
  InstagramPost = "Instagram Post",
  InstagramStory = "Instagram Story",
  Email = "Email",
}

export const CONTENT_TYPES_BY_DESTINATION_TYPE: { [key: string]: string[] } = {
  [DestinationTypes.Instagram]: [ContentType.InstagramPost, ContentType.InstagramStory],
  [DestinationTypes.Email]: [ContentType.Email],
};
