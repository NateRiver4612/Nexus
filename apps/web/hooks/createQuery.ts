import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type AnyQueryFn = (variables: any) => Promise<any>;

type InferData<TFn extends AnyQueryFn> = Awaited<ReturnType<TFn>>;
type InferVariables<TFn extends AnyQueryFn> = Parameters<TFn>[0];

type QueryHookOptions<TFn extends AnyQueryFn> = Omit<
  UseQueryOptions<InferData<TFn>, Error, InferData<TFn>>,
  'queryKey' | 'queryFn'
>;

type QueryHookConfig<TFn extends AnyQueryFn> = {
  /**
   * Derives `enabled` from the query's variables — e.g. `(id) => Boolean(id)`
   * for a detail query that shouldn't fire until an id exists. Composed with
   * AND against any `enabled` a caller passes at the call site, so neither
   * side can silently override the other — both conditions must hold.
   */
  getEnabled?: (variables: InferVariables<TFn>) => boolean;
  defaultOptions?: QueryHookOptions<TFn>;
};

/**
 * Builds a typed `useQuery` hook from a plain async function, inferring
 * TData and TVariables from the function's own signature — same idea as
 * `createMutationHook`, just for reads instead of writes.
 *
 * `getQueryKey` is required rather than inferred, since query keys are a
 * deliberate cache-shape decision (e.g. `projectKeys.detail(id)`), not
 * something derivable from the function signature alone.
 */
export function createQueryHook<TFn extends AnyQueryFn>(
  queryFn: TFn,
  getQueryKey: (variables: InferVariables<TFn>) => readonly unknown[],
  config?: QueryHookConfig<TFn>,
) {
  return function useGeneratedQuery(input?: {
    variables?: InferVariables<TFn>;
    options?: QueryHookOptions<TFn>;
  }) {
    const variables = input?.variables;
    const options = input?.options;

    const derivedEnabled = config?.getEnabled ? config.getEnabled(variables) : true;
    const callerEnabled = options?.enabled ?? true;

    return useQuery<InferData<TFn>>({
      queryKey: getQueryKey(variables),
      queryFn: () => queryFn(variables),
      ...config?.defaultOptions,
      ...options,
      enabled: derivedEnabled && callerEnabled, // AND, not override
    });
  };
}

/**
 * Convenience wrapper for the common "detail query" shape — single id-like
 * variable, disabled until that variable is truthy. Equivalent to calling
 * `createQueryHook(queryFn, getQueryKey, { getEnabled: Boolean, defaultOptions })`
 * directly, just without repeating `getEnabled: (id) => Boolean(id)` on every
 * detail hook.
 */
export function createDetailQueryHook<TFn extends AnyQueryFn>(
  queryFn: TFn,
  getQueryKey: (variables: InferVariables<TFn>) => readonly unknown[],
  defaultOptions?: QueryHookOptions<TFn>,
) {
  return createQueryHook(queryFn, getQueryKey, {
    getEnabled: (variables) => Boolean(variables),
    defaultOptions,
  });
}
