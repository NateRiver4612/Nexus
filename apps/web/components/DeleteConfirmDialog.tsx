import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Spinner } from './ui/spinner';
import { Input } from './ui/input';
import { useState } from 'react';

type DeleteConfirmDialog = {
  open: boolean;
  close: () => void;
  error: string | null;
  confirmDelete: () => void;
  isDeleting: boolean;
  content: string;
  /**
   * When set, the user must type this exact value into the dialog's input
   * before the Delete action becomes enabled (e.g. the item's title).
   */
  requiredText?: string;
  title?: string;
};

const DeleteConfirmDialog = ({
  open,
  close,
  confirmDelete,
  isDeleting = false,
  error,
  content,
  requiredText,
  title = 'Delete this item?',
}: DeleteConfirmDialog) => {
  const [typed, setTyped] = useState('');

  const requiresTyping = !!requiredText?.length;
  const canConfirm = !requiresTyping || typed === requiredText;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isDeleting) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              size="lg"
              color="#d64545"
            ></FontAwesomeIcon>
            <p>{title}</p>
          </AlertDialogTitle>
          <AlertDialogDescription>{content}</AlertDialogDescription>
        </AlertDialogHeader>

        {requiresTyping && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requiredText}</span> to confirm.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isDeleting}
              placeholder={requiredText}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={close}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            onClick={confirmDelete}
            disabled={isDeleting || !canConfirm}
            className="w-21.25 bg-destructive"
          >
            {isDeleting ? <Spinner></Spinner> : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
