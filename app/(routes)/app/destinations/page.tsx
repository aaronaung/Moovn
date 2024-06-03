import { env } from "@/env.mjs";
import { Header2 } from "@/src/components/common/header";

const facebookLoginUrl = `https://www.facebook.com/v20.0/dialog/oauth
?client_id=${env.NEXT_PUBLIC_FACEBOOK_APP_ID}
&display=page
&extras={setup: { channel: "IG_API_ONBOARDING" } }
&redirect_uri=https://up-gazelle-huge.ngrok-free.app/api/facebook/auth/callback
&response_type=token
&scope=instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement`;

export default function Destinations() {
  return (
    <div>
      <Header2 title="Destinations" />
      <div>
        <p className="text-sm text-muted-foreground">Coming soon...</p>
      </div>
    </div>
  );
}
