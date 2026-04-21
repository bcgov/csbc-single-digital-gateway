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

interface PublishVersionDialogProps {
  open: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PublishVersionDialog({
  open,
  isPending,
  onConfirm,
  onCancel,
}: PublishVersionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish Version</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to publish this version? The currently
            published version (if any) will be archived automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-bcgov-blue hover:bg-bcgov-blue/80"
          >
            {isPending ? "Publishing…" : "Publish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
