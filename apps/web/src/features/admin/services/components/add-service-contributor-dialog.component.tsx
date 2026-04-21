import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useAddServiceContributor } from "../data/services.mutations";

interface AddServiceContributorDialogProps {
  serviceId: string;
  trigger?: React.ReactNode;
}

export function AddServiceContributorDialog({
  serviceId,
  trigger,
}: AddServiceContributorDialogProps) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");

  const addMutation = useAddServiceContributor(serviceId);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setUserId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    addMutation.mutate(
      { userId: userId.trim(), role: "owner" },
      {
        onSuccess: () => {
          toast.success("Contributor added");
          setOpen(false);
          setUserId("");
        },
        onError: (err) => {
          toast.error(`Failed to add contributor: ${err.message}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contributor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>User ID</Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "Adding…" : "Add Contributor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
