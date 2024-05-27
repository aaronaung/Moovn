import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pluralOrSingular(
  count: number,
  singular: string,
  plural: string,
) {
  return count === 1 ? singular : plural;
}

export function getAuthCallbackUrl() {
  let url =
    process?.env?.NEXT_PUBLIC_APP_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";
  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;
  url = url.concat("/api/auth/callback");
  return url;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  timeout = 1500,
) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`[${response.status}]: ${response.statusText}`);
    }
    return response;
  } catch (err) {
    if (retries === 0) {
      throw err;
    }
    await sleep(timeout);
    return fetchWithRetry(url, options, retries - 1, timeout);
  }
}

export const generatePassword = (
  length = 20,
  characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$",
) =>
  Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join("");

export const strListDiff = (originalList: string[], newList: string[]) => {
  const added = newList.filter((id) => !originalList.find((i) => i === id));
  const removed = originalList.filter((id) => !newList.find((i) => i === id));
  return {
    added,
    removed,
  };
};
