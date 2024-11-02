export enum DestinationTypes {
  Instagram = "Instagram",
  Email = "Email",
}

export enum PublishStatus {
  Pending = "Pending",
  Published = "Published",
  Failed = "Failed",
}

export type IgPublishResult = {
  ig_media_id: string;
  ig_media_url: string;
  ig_permalink: string;
};
