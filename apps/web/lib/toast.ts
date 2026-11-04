import { toast } from 'sonner';

/** Surfaces an API/unknown error message (from `handleResponse`) in a toast. */
export function toastError(err: unknown) {
  toast.error(err instanceof Error && err.message ? err.message : 'Something went wrong');
}
