import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@repo/ui";
import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

type InviteMethod = "email" | "text";

const expirationOptions = [
  { value: "1", label: "1 month" },
  { value: "2", label: "2 months" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
];

interface InviteDelegateDialogProps {
  trigger?: React.ReactNode;
}

export function InviteDelegateDialog({ trigger }: InviteDelegateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [message, setMessage] = useState("");
  const [expiration, setExpiration] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\d\s\-()+ ]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!contactValue.trim()) {
      newErrors.contactValue =
        inviteMethod === "email"
          ? "Email is required"
          : "Phone number is required";
    } else if (inviteMethod === "email" && !validateEmail(contactValue)) {
      newErrors.contactValue = "Please enter a valid email address";
    } else if (inviteMethod === "text" && !validatePhone(contactValue)) {
      newErrors.contactValue = "Please enter a valid phone number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    toast.success(`Invitation sent to ${name}`);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setInviteMethod("email");
    setContactValue("");
    setMessage("");
    setExpiration("1");
    setErrors({});
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon">
              <IconUserPlus className="size-5" />
              <span className="sr-only">Invite delegate</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a delegate</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            A delegate is someone you trust to help complete this application on
            your behalf. This could be a family member, caregiver, or authorized
            representative. They will receive a secure link to access and submit
            the application for you.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="delegate-name">Name</Label>
            <Input
              id="delegate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter delegate's name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>How do you want to invite your delegate?</Label>
            <RadioGroup
              value={inviteMethod}
              onValueChange={(value) => {
                setInviteMethod(value as InviteMethod);
                setContactValue("");
                setErrors({});
              }}
              className="flex flex-row gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="invite-email" />
                <Label
                  htmlFor="invite-email"
                  className="font-normal cursor-pointer"
                >
                  Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="text" id="invite-text" />
                <Label
                  htmlFor="invite-text"
                  className="font-normal cursor-pointer"
                >
                  Text Message
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contact-value">
              {inviteMethod === "email" ? "Email address" : "Phone number"}
            </Label>
            <Input
              id="contact-value"
              type={inviteMethod === "email" ? "email" : "tel"}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                inviteMethod === "email"
                  ? "name@example.com"
                  : "+1 (555) 123-4567"
              }
            />
            {errors.contactValue && (
              <p className="text-sm text-destructive">{errors.contactValue}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to your invitation"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expiration">Expiration</Label>
            <p className="text-sm text-muted-foreground">
              How long your delegate can access the service on your behalf.
            </p>
            <Select value={expiration} onValueChange={setExpiration}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {
                    expirationOptions.find((opt) => opt.value === expiration)
                      ?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {expirationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
          >
            Invite Delegate
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
