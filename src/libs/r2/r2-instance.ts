import { env } from "@/env.mjs";
import R2Storage from "@/src/libs/r2/r2-storage";

const r2Instance = new R2Storage(env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY_ID, env.R2_SECRET_ACCESS_KEY);

export default r2Instance;
