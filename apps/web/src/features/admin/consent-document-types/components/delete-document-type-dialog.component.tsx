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

interface DeleteDocumentTypeDialogProps {
  typeId: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDocumentTypeDialog({
  typeId,
  isPending,
  onConfirm,
  onCancel,
}: DeleteDocumentTypeDialogProps) {
  return (
    <AlertDialog open={!!typeId} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document Type</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this document type? All versions and
            translations will also be deleted. This action cannot be undone.
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
