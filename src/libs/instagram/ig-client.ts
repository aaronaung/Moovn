import { addDays, isAfter } from "date-fns";
import {
  CreateCarouselContainerInput,
  CreateCarouselContainerResult,
  CreateMediaContainerInput,
  CreateMediaContainerResult,
  InstagramAPIToken,
  InstagramBusinessAccount,
  InstagramMedia,
} from "./types";

export class InstagramAPIClient {
  static BASE_URL = "https://api.instagram.com";
  static GRAPH_API_BASE_URL = "https://graph.instagram.com";
  static GRAPH_API_VERSION = "v20.0";

  constructor(
    private token: InstagramAPIToken,
    private onTokenRefresh?: (token: InstagramAPIToken) => void,
  ) {}

  static async exchangeCodeForAccessToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    // can't use this.get because this is a static method.
    const tokenExchangeUrl = new URL(this.BASE_URL);
    tokenExchangeUrl.pathname = "/oauth/access_token";

    const formData = new FormData();
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);
    formData.append("grant_type", "authorization_code");
    formData.append("code", code);
    formData.append("redirect_uri", redirectUri);

    const shortLivedTokenResp = await (
      await fetch(tokenExchangeUrl.toString(), {
        method: "POST",
        body: formData,
      })
    ).json();

    const shortLivedToken = shortLivedTokenResp?.access_token;
    if (!shortLivedToken) {
      throw new Error(`failed to fetch short lived token: ${shortLivedTokenResp}`);
    }

    const longLivedTokenUrl = new URL(this.GRAPH_API_BASE_URL);
    longLivedTokenUrl.pathname = "/access_token";
    longLivedTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedTokenUrl.searchParams.set("client_secret", clientSecret);
    longLivedTokenUrl.searchParams.set("access_token", shortLivedToken);
    const longLivedToken = await (await fetch(longLivedTokenUrl.toString())).json();
    return longLivedToken;
  }

  private async refreshTokenIfNeeded() {
    const now = new Date();
    const shouldRefresh = isAfter(now, addDays(this.token.lastRefreshedAt ?? new Date(), 10));
    if (!shouldRefresh) {
      return;
    }

    const url = new URL(InstagramAPIClient.GRAPH_API_BASE_URL);
    url.pathname = "/refresh_access_token";
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("access_token", this.token.accessToken);

    const refreshedToken = await (await fetch(url.toString())).json();
    if (refreshedToken?.access_token) {
      this.token = {
        accessToken: refreshedToken.access_token,
        lastRefreshedAt: now,
      };
      this.onTokenRefresh?.(this.token);
    }
  }

  private async request(options: {
    method: string;
    path: string;
    searchParams?: URLSearchParams;
    body?: Object;
  }) {
    // Note: fb api always accepts arguments through url query params and not body, even for POST requests.
    const url = new URL(`${InstagramAPIClient.GRAPH_API_BASE_URL}`);
    url.pathname = `/${InstagramAPIClient.GRAPH_API_VERSION}${options.path}`;

    if (options.searchParams) {
      options.searchParams.append("access_token", this.token.accessToken);
      url.search = options.searchParams.toString();
    }

    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      const resp = await fetch(url.toString(), {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.token.accessToken}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });

      try {
        const result = JSON.parse(await resp.text());
        console.log({
          url: url.toString(),
          method: options.method,
          body: options.body,
          status: resp.status,
          statusText: resp.statusText,
          result,
        });

        if (result && result.code === 4) {
          // Application limit reach error code
          retries++;
          if (retries < maxRetries) {
            console.log(`Retrying request (attempt ${retries + 1}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries)); // Exponential backoff
            continue;
          }
        }

        return result;
      } catch (err) {
        console.error("Failed to parse json response", err);
        throw err;
      }
    }

    throw new Error(`Request failed after ${maxRetries} retries`);
  }

  private async createMediaContainer(
    accountId: string,
    req: CreateMediaContainerInput,
    mediaType?: "STORIES" | "REELS", // default to POST
  ): Promise<CreateMediaContainerResult> {
    const body = {
      ...(mediaType ? { media_type: mediaType } : {}),
      ...(req.imageUrl ? { image_url: req.imageUrl } : {}),
      ...(req.isCarouselItem ? { is_carousel_item: req.isCarouselItem } : {}),
      ...(req.caption ? { caption: req.caption } : {}),
      ...(req.locationId ? { location_id: req.locationId } : {}),
      ...(req.userTags ? { user_tags: req.userTags } : {}),
    };
    const resp = await this.request({ method: "POST", path: `/${accountId}/media`, body });
    console.log("createMediaContainer resp", resp);
    return resp;
  }

  private async createCarouselContainer(
    accountId: string,
    req: CreateCarouselContainerInput,
  ): Promise<CreateCarouselContainerResult> {
    const searchParams = new URLSearchParams();
    searchParams.set("media_type", "CAROUSEL");
    searchParams.set("children", req.children.join(","));
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
    const resp = await this.request({ method: "POST", path: `/${accountId}/media`, searchParams });
    console.log("createCarouselContainer resp", resp);
    return resp;
  }

  private async publishMediaContainer(accountId: string, mediaContainerId: string) {
    const body = {
      creation_id: mediaContainerId,
    };
    return this.request({ method: "POST", path: `/${accountId}/media_publish`, body });
  }

  async getMe(): Promise<InstagramBusinessAccount> {
    await this.refreshTokenIfNeeded();

    const result = await this.request({
      method: "GET",
      path: "/me",
      searchParams: new URLSearchParams("fields=user_id,username,profile_picture_url"),
    });
    return {
      id: result.user_id,
      username: result.username,
      profilePictureUrl: result.profile_picture_url,
    };
  }

  async getInstagramMedia(mediaId: string): Promise<InstagramMedia> {
    await this.refreshTokenIfNeeded();

    return this.request({
      method: "GET",
      path: `/${mediaId}`,
      searchParams: new URLSearchParams("fields=id,permalink,media_url"),
    });
  }

  async publishStory(
    accountId: string,
    input: Omit<CreateMediaContainerInput, "isCarouselItem" | "userTags" | "caption">,
  ) {
    const mediaContainer = await this.createMediaContainer(accountId, input, "STORIES");
    return this.publishMediaContainer(accountId, mediaContainer.id);
  }

  async publishPost(
    accountId: string,
    input: Omit<CreateMediaContainerInput, "isCarouselItem">,
  ): Promise<{ id: string }> {
    await this.refreshTokenIfNeeded();

    const mediaContainer = await this.createMediaContainer(accountId, input);
    return this.publishMediaContainer(accountId, mediaContainer.id);
  }

  async publishCarouselPost(
    accountId: string,
    mediaInput: Omit<CreateMediaContainerInput, "isCarouselItem" | "caption">[],
    carouselInput: Omit<CreateCarouselContainerInput, "children">,
  ): Promise<{ id: string }> {
    await this.refreshTokenIfNeeded();

    const mediaContainers: { id: string }[] = [];
    for (const input of mediaInput) {
      const container = await this.createMediaContainer(accountId, {
        ...input,
        isCarouselItem: true,
      });
      mediaContainers.push(container);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay to avoid rate limit/spam detection.
    }
    const carouselContainer = await this.createCarouselContainer(accountId, {
      ...carouselInput,
      children: mediaContainers.map((result) => result.id),
    });
    return this.publishMediaContainer(accountId, carouselContainer.id);
  }
}
