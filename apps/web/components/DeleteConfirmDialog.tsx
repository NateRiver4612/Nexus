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
type DeleteConfirmDialog = {
  open: boolean;
  close: () => void;
  error: string | null;
  confirmDelete: () => void;
  isDeleting: boolean;
  content: string;
};

const DeleteConfirmDialog = ({
  open,
  close,
  confirmDelete,
  isDeleting = false,
  error,
  content,
}: DeleteConfirmDialog) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              size="lg"
              color="#d69d22"
            ></FontAwesomeIcon>
            <p>Delete this source?</p>
          </AlertDialogTitle>
          <AlertDialogDescription>{content}</AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={close}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="w-21.25">
            {isDeleting ? <Spinner></Spinner> : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
