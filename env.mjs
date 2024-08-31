import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: z.string().min(1),
    SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // STRIPE_SECRET_KEY: z.string().min(1),
    // STRIPE_WEBHOOK_SECRET: z.string().min(1),

    PIKE13_CLIENT_ID: z.string().min(1),
    FACEBOOK_APP_SECRET: z.string().min(1),
    CONTENT_SCHEDULING_API_HOST: z.string().min(1),
    CONTENT_SCHEDULING_API_KEY: z.string().min(1),

    MINDBODY_API_KEY: z.string().min(1),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    // NEXT_PUBLIC_STRIPE_STARTER_PLAN_PRICE_ID: z.string().min(1),
    // NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE_ID: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
    // NEXT_PUBLIC_GOOGLE_MAP_API_KEY: z.string().min(1),
    // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().min(1),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // NEXT_PUBLIC_GOOGLE_MAP_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY,
    // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    //   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // NEXT_PUBLIC_STRIPE_STARTER_PLAN_PRICE_ID:
    //   process.env.NEXT_PUBLIC_STRIPE_STARTER_PLAN_PRICE_ID,
    // NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE_ID:
    //   process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,

    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID,
    SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    PIKE13_CLIENT_ID: process.env.PIKE13_CLIENT_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    CONTENT_SCHEDULING_API_HOST: process.env.CONTENT_SCHEDULING_API_HOST,
    CONTENT_SCHEDULING_API_KEY: process.env.CONTENT_SCHEDULING_API_KEY,
    MINDBODY_API_KEY: process.env.MINDBODY_API_KEY,
  },
});
