export type InstagramAPIToken = {
  long_lived_access_token: string;
  last_refreshed_at: Date;
};

export type InstagramBusinessAccount = {
  id: string;
  username: string;
  profile_picture_url: string;
};

export type InstagramMedia = {
  id: string;
  permalink: string;
  media_url: string;
  // more here: https://developers.facebook.com/docs/instagram-api/reference/media/
};

export type CreateMediaContainerInput = {
  media_type?: "STORIES" | "REELS";
  image_url?: string;
  video_url?: string;
  is_carousel_item?: boolean;
  caption?: string;
  location_id?: string;
  user_tags?: {
    username: string;
    x: number;
    y: number;
  }[];
};

export type CreateMediaContainerResult = {
  id: string;
  uri: string;
};

export type CreateCarouselContainerInput = {
  caption?: string;
  share_to_feed?: boolean;
  collaborators?: string[];
  location_id?: string;
  children: string[]; // media container ids
};

export type CreateCarouselContainerResult = {
  id: string;
  uri: string;
};
