import { RotateCw } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type RegeneratePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
};

export const RegeneratePlanDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RegeneratePlanDialogProps) => {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) {
          onOpenChange(next);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <RotateCw className="size-5 text-primary" />
            Regenerate plan?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This generates a brand-new plan and replaces the preview you&apos;re viewing. The new
            plan may differ from the current one even if nothing in your onboarding answers has
            changed. Your current preview will be discarded.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending && <RotateCw className="size-4 animate-spin" />}
            Regenerate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
