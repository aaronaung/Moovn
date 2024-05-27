import {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { SupabaseOptions } from "../data/clients/types";
import { supaClientComponentClient } from "../data/clients/browser";

type MutationFnWithArgs<Args, Result> = (
  args: Args,
  supaOptions: SupabaseOptions,
) => Promise<Result>;

export function useSupaMutation<Args, Result>(
  fn: MutationFnWithArgs<Args, Result>,
  options: UseMutationOptions<Result, Error, Args, unknown> & {
    invalidate?: string[][];
    errorMessage?: string;
  } = {},
): UseMutationResult<Result, Error, Args, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (mutationArgs: Args) =>
      fn(mutationArgs, { client: supaClientComponentClient }),
    meta: {
      errorMessage: options.errorMessage || "Failed to run mutation.",
      ...options.meta,
    },
    onSuccess: (data, variables, context) => {
      for (const queryKey of options.invalidate || []) {
        queryClient.invalidateQueries({ queryKey });
      }
      options.onSuccess?.(data, variables, context);
    },
  });
}

type QueryFnWithArgs<Args, Result> = (
  args: Args,
  supaOptions: SupabaseOptions,
) => Promise<Result>;

type QueryFnWithoutArgs<Result> = (
  supaOptions: SupabaseOptions,
) => Promise<Result>;

export function useSupaQuery<Args, Result>(
  fn: QueryFnWithArgs<Args, Result> | QueryFnWithoutArgs<Result>,
  options?: UseQueryOptions & {
    errorMessage?: string;
    arg?: Args;
  },
) {
  const { data, error, ...props } = useQuery<Result, Error, Result>({
    // @ts-ignore
    queryFn:
      options && "arg" in options
        ? () =>
            (fn as QueryFnWithArgs<Args, Result>)(options.arg!, {
              client: supaClientComponentClient,
            })
        : () =>
            (fn as QueryFnWithoutArgs<Result>)({
              client: supaClientComponentClient,
            }),
    meta: { errorMessage: options?.errorMessage || "Failed to run query." },
    ...(options || {}),
  });

  if (error) {
    console.error(error);
    // direct to error page. TODO: create error page.
  }

  return {
    ...props,
    data,
  };
}
