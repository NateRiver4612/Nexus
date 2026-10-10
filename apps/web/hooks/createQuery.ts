import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

type AnyQueryFn = (variables: any) => Promise<any>;

type InferData<TFn extends AnyQueryFn> = Awaited<ReturnType<TFn>>;
type InferVariables<TFn extends AnyQueryFn> = Parameters<TFn>[0];

type QueryHookOptions<TFn extends AnyQueryFn> = Omit<
  UseQueryOptions<InferData<TFn>, Error, InferData<TFn>>,
  'queryKey' | 'queryFn'
>;

/**
 * Mirrors the underlying query fn's own parameter requiredness: if `TFn`'s
 * param accepts `undefined` (optional arg, e.g. `getDeliverables(id?: string)`),
 * `variables` stays optional here too. If `TFn` requires an argument
 * (`getKnowledgeSources(id: string)`), `variables` becomes a required key —
 * so hovering it shows `string`, not `string | undefined`, and omitting it
 * is a type error instead of a silent `undefined` at runtime.
 */
type QueryHookInput<TFn extends AnyQueryFn> =
  undefined extends InferVariables<TFn>
    ? { variables?: InferVariables<TFn>; options?: QueryHookOptions<TFn> }
    : { variables: InferVariables<TFn>; options?: QueryHookOptions<TFn> };

/** Same idea one level up: the whole `input` object becomes required to match. */
type UseGeneratedQuery<TFn extends AnyQueryFn> =
  undefined extends InferVariables<TFn>
    ? (input?: QueryHookInput<TFn>) => UseQueryResult<InferData<TFn>, Error>
    : (input: QueryHookInput<TFn>) => UseQueryResult<InferData<TFn>, Error>;

type QueryHookConfig<TFn extends AnyQueryFn> = {
  getEnabled?: (variables: InferVariables<TFn>) => boolean;
  defaultOptions?: QueryHookOptions<TFn>;
};

export function createQueryHook<TFn extends AnyQueryFn>(
  queryFn: TFn,
  getQueryKey: (variables: InferVariables<TFn>) => readonly unknown[],
  config?: QueryHookConfig<TFn>,
): UseGeneratedQuery<TFn> {
  // Implemented loosely (input fully optional) since TS can't distribute a
  // conditional type over a generic implementation signature — the stricter,
  // correct-per-TFn signature is applied via the return type cast below.
  const useGeneratedQuery = (input?: {
    variables?: InferVariables<TFn>;
    options?: QueryHookOptions<TFn>;
  }) => {
    const variables = input?.variables as InferVariables<TFn>;
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

  return useGeneratedQuery as UseGeneratedQuery<TFn>;
}

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
