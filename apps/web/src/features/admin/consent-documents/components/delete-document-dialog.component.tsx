import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui";

interface DeleteDocumentDialogProps {
  docId: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDocumentDialog({
  docId,
  isPending,
  onConfirm,
  onCancel,
}: DeleteDocumentDialogProps) {
  return (
    <AlertDialog open={!!docId} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this consent document? All versions,
            translations, and contributors will also be deleted. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
