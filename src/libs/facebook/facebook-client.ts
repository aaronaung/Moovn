import { env } from "@/env.mjs";
import { addDays, isAfter } from "date-fns";
import {
  CreateCarouselContainerInput,
  CreateCarouselContainerResult,
  CreateMediaContainerInput,
  CreateMediaContainerResult,
  FacebookAPIToken,
  InstagramBusinessAccount,
  InstagramMedia,
} from "./types";

export class FacebookGraphAPIClient {
  static BASE_URL = "https://graph.facebook.com/v20.0";

  constructor(
    private token: FacebookAPIToken,
    private onTokenRefresh?: (token: FacebookAPIToken) => void,
  ) {}

  static async exchangeCodeForAccessToken(code: string, redirectUri: string) {
    // can't use this.get because this is a static method.
    const tokenExchangeUrl = new URL(this.BASE_URL);
    tokenExchangeUrl.pathname = "/oauth/access_token";
    tokenExchangeUrl.searchParams.set("client_id", env.NEXT_PUBLIC_FACEBOOK_APP_ID);
    tokenExchangeUrl.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    tokenExchangeUrl.searchParams.set("code", code);
    tokenExchangeUrl.searchParams.set("redirect_uri", redirectUri);

    return await (await fetch(tokenExchangeUrl.toString())).json();
  }

  private async refreshTokenIfNeeded() {
    const now = new Date();
    const shouldRefresh = isAfter(now, addDays(this.token.lastRefreshedAt, 10));
    if (!shouldRefresh) {
      return;
    }

    const url = new URL(FacebookGraphAPIClient.BASE_URL);
    url.pathname = "/oauth/access_token";
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", env.NEXT_PUBLIC_FACEBOOK_APP_ID);
    url.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    url.searchParams.set("fb_exchange_token", this.token.accessToken);

    const token = await (await fetch(url.toString())).json();
    this.onTokenRefresh?.({
      accessToken: token.access_token,
      lastRefreshedAt: now,
    });
  }

  private async request(method: string, path: string, searchParams?: URLSearchParams) {
    // Note: fb api always accepts arguments through url query params and not body, even for POST requests.
    const url = new URL(FacebookGraphAPIClient.BASE_URL);
    url.pathname = path;
    if (searchParams) {
      searchParams.set("access_token", this.token.accessToken);
      url.search = searchParams.toString();
    }

    return (
      await fetch(url.toString(), {
        method,
      })
    ).json();
  }

  async getInstagramAccounts(): Promise<InstagramBusinessAccount[]> {
    await this.refreshTokenIfNeeded();

    const result = await this.request(
      "GET",
      "/me/accounts",
      new URLSearchParams(
        "fields=id,name,instagram_business_account{id, username, profile_picture_url}",
      ),
    );
    return (result.data || [])
      .filter((account: any) => account.instagram_business_account)
      .map((account: any) => ({
        id: account.instagram_business_account.id,
        username: account.instagram_business_account.username,
        profilePictureUrl: account.instagram_business_account.profile_picture_url,
      }));
  }

  async getInstagramMedia(mediaId: string): Promise<InstagramMedia> {
    await this.refreshTokenIfNeeded();

    return this.request("GET", `/${mediaId}`, new URLSearchParams("fields=id,permalink"));
  }

  async publishSingle(
    accountId: string,
    input: Omit<CreateMediaContainerInput, "isCarouselItem">,
  ): Promise<{ id: string }> {
    await this.refreshTokenIfNeeded();

    const mediaContainer = await this.createMediaContainer(accountId, input);
    return this.publishMediaContainer(accountId, mediaContainer.id);
  }

  async publishCarousel(
    accountId: string,
    mediaInput: Omit<CreateMediaContainerInput, "isCarouselItem" | "caption">[],
    carouselInput: Omit<CreateCarouselContainerInput, "children">,
  ): Promise<{ id: string }> {
    await this.refreshTokenIfNeeded();

    console.log("mediaInput", mediaInput);
    const $createMediaContainers: Promise<{ id: string }>[] = mediaInput.map((input) =>
      this.createMediaContainer(accountId, { ...input, isCarouselItem: true }),
    );
    const mediaContainers = await Promise.all($createMediaContainers);
    console.log("mediaContainers", mediaContainers);
    const carouselContainer = await this.createCarouselContainer(accountId, {
      ...carouselInput,
      children: mediaContainers.map((result) => result.id),
    });
    console.log("carouselContainer", carouselContainer);
    return this.publishMediaContainer(accountId, carouselContainer.id);
  }

  private async publishMediaContainer(accountId: string, mediaContainerId: string) {
    const searchParams = new URLSearchParams();
    console.log("mediaContainerId", mediaContainerId);
    searchParams.set("creation_id", mediaContainerId);
    return this.request("POST", `/${accountId}/media_publish`, searchParams);
  }

  private async createMediaContainer(
    accountId: string,
    req: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    const searchParams = new URLSearchParams();
    searchParams.set("image_url", req.imageUrl);
    if (req.isCarouselItem) {
      // If isCarouselItem is present or true, the media will be added to a carousel container.
      searchParams.set("is_carousel_item", req.isCarouselItem.toString());
    }
    if (req.caption) {
      // Caption is not required for carousel items, because the caption is set on the carousel container.
      searchParams.set("caption", req.caption);
    }
    if (req.locationId) {
      searchParams.set("location_id", req.locationId);
    }
    if (req.userTags) {
      searchParams.set("user_tags", JSON.stringify(req.userTags));
    }
    return this.request("POST", `/${accountId}/media`, searchParams);
  }

  private async createCarouselContainer(
    accountId: string,
    req: CreateCarouselContainerInput,
  ): Promise<CreateCarouselContainerResult> {
    const searchParams = new URLSearchParams();
    searchParams.set("media_type", "CAROUSEL");
    searchParams.set("children", JSON.stringify(req.children));
    if (req.caption) {
      searchParams.set("caption", req.caption);
    }
    if (req.shareToFeed) {
      searchParams.set("share_to_feed", req.shareToFeed.toString());
    }
    if (req.collaborators) {
      searchParams.set("collaborators", JSON.stringify(req.collaborators));
    }
    if (req.locationId) {
      searchParams.set("location_id", req.locationId);
    }
    return this.request("POST", `/${accountId}/media`, searchParams);
  }
}
