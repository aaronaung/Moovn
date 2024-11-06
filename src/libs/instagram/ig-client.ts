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

  private longLivedAccessToken: string;
  private lastRefreshedAt: Date;
  private onTokenRefresh?: (token: InstagramAPIToken) => Promise<void>;

  constructor(
    token: InstagramAPIToken,
    onTokenRefresh?: (token: InstagramAPIToken) => Promise<void>,
  ) {
    this.longLivedAccessToken = token.long_lived_access_token;
    this.lastRefreshedAt = token.last_refreshed_at;
    this.onTokenRefresh = onTokenRefresh;
  }

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
    const shouldRefresh = isAfter(now, addDays(this.lastRefreshedAt, 10));
    if (!shouldRefresh) {
      return;
    }

    const url = new URL(InstagramAPIClient.GRAPH_API_BASE_URL);
    url.pathname = "/refresh_access_token";
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", this.longLivedAccessToken);

    const refreshedToken = await (await fetch(url.toString())).json();
    if (refreshedToken?.access_token) {
      this.longLivedAccessToken = refreshedToken.access_token;
      this.lastRefreshedAt = now;
      if (this.onTokenRefresh) {
        await this.onTokenRefresh({
          long_lived_access_token: this.longLivedAccessToken,
          last_refreshed_at: this.lastRefreshedAt,
        });
      }
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
      options.searchParams.append("access_token", this.longLivedAccessToken);
      url.search = options.searchParams.toString();
    }

    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      const resp = await fetch(url.toString(), {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.longLivedAccessToken}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });

      try {
        const result = JSON.parse(await resp.text());
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

  private async checkMediaContainerStatus(
    containerId: string,
    maxAttempts: number = 60, // 1 min max wait time, check every 2 second
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.request({
        method: "GET",
        path: `/${containerId}`,
        searchParams: new URLSearchParams("fields=status_code,status"),
      });

      console.log("Media container status check:", {
        containerId,
        attempt: attempt + 1,
        result,
      });
      if (result.copyright_check_status?.matches_found) {
        throw new Error(
          `Media container creation failed: Copyright violation detected for ${containerId}`,
        );
      }
      if (result.status_code === "ERROR") {
        throw new Error(`Media container creation failed: ${result.status}`);
      }
      if (result.status_code === "FINISHED") {
        return true;
      }

      // Wait before next attempt (with exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Media container not ready after ${maxAttempts} attempts`);
  }

  private async createMediaContainer(
    accountId: string,
    req: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    const body = req;
    const resp = await this.request({ method: "POST", path: `/${accountId}/media`, body });
    console.log("createMediaContainer resp", { req, resp });

    if (!resp.id) {
      throw new Error(
        `Failed to create media container for ig user ${accountId} - no ID returned: ${JSON.stringify(
          { resp },
        )}`,
      );
    }

    // Wait for the container to be ready
    await this.checkMediaContainerStatus(resp.id);
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
    if (req.share_to_feed) {
      searchParams.set("share_to_feed", req.share_to_feed.toString());
    }
    if (req.collaborators) {
      searchParams.set("collaborators", JSON.stringify(req.collaborators));
    }
    if (req.location_id) {
      searchParams.set("location_id", req.location_id);
    }
    const resp = await this.request({ method: "POST", path: `/${accountId}/media`, searchParams });
    console.log("createCarouselContainer resp", { req, resp });

    if (!resp.id) {
      throw new Error(
        `Failed to create carousel container for ig user ${accountId} - no ID returned: ${JSON.stringify(
          resp,
        )}`,
      );
    }
    await this.checkMediaContainerStatus(resp.id);
    return resp;
  }

  private async publishMediaContainer(accountId: string, mediaContainerId: string) {
    const body = {
      creation_id: mediaContainerId,
    };
    const resp = await this.request({ method: "POST", path: `/${accountId}/media_publish`, body });
    console.log("publishMediaContainer resp", { mediaContainerId, resp });
    if (!resp.id) {
      throw new Error(
        `Failed to publish media container for ig user ${accountId} - no ID returned: ${JSON.stringify(
          resp,
        )}`,
      );
    }
    return resp;
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
      profile_picture_url: result.profile_picture_url,
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
    igUserId: string,
    input: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    await this.refreshTokenIfNeeded();

    const mediaContainer = await this.createMediaContainer(igUserId, {
      ...input,
      media_type: "STORIES",
    });
    return this.publishMediaContainer(igUserId, mediaContainer.id);
  }

  async publishPost(
    igUserId: string,
    input: CreateMediaContainerInput,
  ): Promise<CreateMediaContainerResult> {
    await this.refreshTokenIfNeeded();

    const mediaContainer = await this.createMediaContainer(igUserId, input);
    return this.publishMediaContainer(igUserId, mediaContainer.id);
  }

  async publishCarouselPost(
    igUserId: string,
    media: CreateMediaContainerInput[],
    { caption }: { caption?: string },
  ): Promise<CreateMediaContainerResult> {
    await this.refreshTokenIfNeeded();

    const mediaContainers: { id: string }[] = [];
    for (const input of media) {
      const container = await this.createMediaContainer(igUserId, {
        ...input,
        is_carousel_item: true,
      });
      mediaContainers.push(container);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay to avoid rate limit/spam detection.
    }
    const carouselContainer = await this.createCarouselContainer(igUserId, {
      children: mediaContainers.map((result) => result.id),
      ...(caption ? { caption } : {}),
    });

    return this.publishMediaContainer(igUserId, carouselContainer.id);
  }
}
