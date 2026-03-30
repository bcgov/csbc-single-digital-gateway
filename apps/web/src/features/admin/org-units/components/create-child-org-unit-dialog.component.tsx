import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateChildOrgUnit } from "../data/org-units.mutations";

interface CreateChildOrgUnitDialogProps {
  parentId: string;
  allowedTypes: string[];
  trigger?: React.ReactNode;
}

export function CreateChildOrgUnitDialog({
  parentId,
  allowedTypes,
  trigger,
}: CreateChildOrgUnitDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(allowedTypes[0] ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateChildOrgUnit(parentId);

  const resetForm = () => {
    setName("");
    setType(allowedTypes[0] ?? "");
    setErrors({});
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!type) {
      newErrors.type = "Type is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    createMutation.mutate(
      { name: name.trim(), type },
      {
        onSuccess: () => {
          toast.success(`Created ${type} "${name.trim()}"`);
          setOpen(false);
          resetForm();
        },
        onError: (err) => {
          toast.error(`Failed to create: ${err.message}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Child Org Unit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Create a new organizational unit under this parent.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="child-name">Name</Label>
            <Input
              id="child-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter org unit name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="child-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => value && setType(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue className="capitalize" />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="capitalize">{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Org Unit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
