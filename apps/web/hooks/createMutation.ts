import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

type AnyMutationFn = (variables: any) => Promise<any>;

type InferData<TFn extends AnyMutationFn> = Awaited<ReturnType<TFn>>;
type InferVariables<TFn extends AnyMutationFn> = Parameters<TFn>[0];

type MutationHookOptions<TFn extends AnyMutationFn> = Omit<
  UseMutationOptions<InferData<TFn>, unknown, InferVariables<TFn>>,
  'mutationFn'
>;

/**
 * Runs multiple optional callbacks in sequence, skipping any that are undefined.
 * Used so a default (e.g. invalidateQueries) and a caller-provided override
 * both fire, rather than one silently overwriting the other.
 */
function composeCallbacks<TArgs extends unknown[]>(
  ...fns: Array<((...args: TArgs) => unknown) | undefined>
) {
  return (...args: TArgs) => {
    for (const fn of fns) {
      fn?.(...args);
    }
  };
}

/**
 * Builds a typed `useMutation` hook from a plain async function, inferring
 * TData and TVariables automatically from the function's own signature —
 * no manual `MutationOptions<Awaited<ReturnType<typeof fn>>, unknown, Input>` needed.
 *
 * `getDefaultOptions` receives the QueryClient so you can wire up cache
 * invalidation, optimistic updates, etc. as the hook's baseline behavior —
 * any options a caller passes into the generated hook are composed with
 * (not silently overridden by) these defaults.
 */
export function createMutationHook<TFn extends AnyMutationFn>(
  mutationFn: TFn,
  getDefaultOptions?: (queryClient: QueryClient) => MutationHookOptions<TFn>,
) {
  return function useGeneratedMutation(props?: MutationHookOptions<TFn>) {
    const queryClient = useQueryClient();
    const defaults = getDefaultOptions?.(queryClient) ?? {};

    return useMutation<InferData<TFn>, unknown, InferVariables<TFn>>({
      mutationFn,
      ...defaults,
      ...props,
      onMutate: composeCallbacks(defaults.onMutate, props?.onMutate),
      onError: composeCallbacks(defaults.onError, props?.onError),
      onSuccess: composeCallbacks(defaults.onSuccess, props?.onSuccess),
      onSettled: composeCallbacks(defaults.onSettled, props?.onSettled),
    });
  };
}
