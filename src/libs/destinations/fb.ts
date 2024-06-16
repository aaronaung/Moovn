import { env } from "@/env.mjs";

export class FacebookGraphAPIClient {
  private accessToken: string;
  static BASE_URL = "https://graph.facebook.com/v20.0";

  constructor({ accessToken }: { accessToken: string }) {
    this.accessToken = accessToken;
  }

  private async get(path: string, searchParams?: URLSearchParams) {
    const url = new URL(FacebookGraphAPIClient.BASE_URL);
    url.pathname = path;
    if (searchParams) {
      searchParams.set("access_token", this.accessToken);
      url.search = searchParams.toString();
    }

    const resp = await fetch(url.toString());
    return resp.json();
  }

  static async exchangeCodeForAccessToken(code: string, redirectUri: string) {
    const tokenExchangeUrl = new URL(this.BASE_URL);
    tokenExchangeUrl.pathname = "/oauth/access_token";
    tokenExchangeUrl.searchParams.set(
      "client_id",
      env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    );
    tokenExchangeUrl.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    tokenExchangeUrl.searchParams.set("code", code);
    tokenExchangeUrl.searchParams.set("redirect_uri", redirectUri);

    return await (await fetch(tokenExchangeUrl.toString())).json();
  }

  async getPages() {
    const resp = await this.get(`/me/accounts`);
    return resp.data || [];
  }

  async getPosts(pageId: string) {
    const resp = await this.get(`/${pageId}/posts`);
    return resp.data || [];
  }
}
