import { env } from "@/env.mjs";
import { ServerToServerTokenProvider } from "@adobe/firefly-services-common-apis";

function getAuthProvider(
  clientId: string,
  clientSecret: string,
  scopes: string,
) {
  const serverToServerAuthDetails = {
    clientId,
    clientSecret,
    scopes, ///configple:  "openid,AdobeID,read_organizations,firefly_api,ff_apis"
  };
  const serverToServerAuthOptions = {
    autoRefresh: true,
  };
  return new ServerToServerTokenProvider(
    serverToServerAuthDetails,
    serverToServerAuthOptions,
  );
}
export const adobeAuthConfig = {
  tokenProvider: getAuthProvider(
    env.ADOBE_CLIENT_ID,
    env.ADOBE_CLIENT_SECRET,
    "openid, AdobeID, read_organizations",
  ),
  clientId: env.ADOBE_CLIENT_ID,
};
