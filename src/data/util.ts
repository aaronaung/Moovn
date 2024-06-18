import { Json } from "@/types/db";
import { PostgrestBuilder } from "@supabase/postgrest-js";

export async function throwOrData<Result>(fn: PostgrestBuilder<Result>) {
  const { data, error } = await fn;
  if (error) {
    throw error;
  }
  return data;
}

export async function throwOrCount<Result>(fn: PostgrestBuilder<Result>) {
  const { count, error } = await fn;
  if (error) {
    throw error;
  }
  return count ?? 0;
}

// Note: this is a hacky way to get around the fact that the type of the result of a pg function is not known.
export async function throwOrJsonData<Result>(fn: PostgrestBuilder<Result | Json>) {
  const { data, error } = await fn;
  if (error) {
    throw error;
  }
  return data as Result;
}
