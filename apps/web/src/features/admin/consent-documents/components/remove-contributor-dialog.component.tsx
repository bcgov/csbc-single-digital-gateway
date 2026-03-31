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
import type { Contributor } from "../data/consent-documents.query";

interface RemoveContributorDialogProps {
  contributor: Contributor | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveContributorDialog({
  contributor,
  isPending,
  onConfirm,
  onCancel,
}: RemoveContributorDialogProps) {
  const displayName =
    contributor?.name ?? contributor?.email ?? "this contributor";

  return (
    <AlertDialog
      open={!!contributor}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Contributor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {displayName} from this document?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
