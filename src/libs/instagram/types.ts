export type InstagramAPIToken = {
  accessToken: string;
  lastRefreshedAt: Date;
};

export type InstagramBusinessAccount = {
  id: string;
  username: string;
  profilePictureUrl: string;
};

export type InstagramMedia = {
  id: string;
  permalink: string;
  // more here: https://developers.facebook.com/docs/instagram-api/reference/ig-media/
};

export type CreateMediaContainerInput = {
  imageUrl: string;
  isCarouselItem?: boolean;
  caption?: string;
  locationId?: string;
  userTags?: {
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
  shareToFeed?: boolean;
  collaborators?: string[];
  locationId?: string;
  children: string[]; // media container ids
};
export type CreateCarouselContainerResult = {
  id: string;
  uri: string;
};
