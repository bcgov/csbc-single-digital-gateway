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
import { ServiceTranslationForm } from "./service-translation-form.component";

interface AddServiceTranslationDialogProps {
  serviceId: string;
  versionId: string;
  existingLocales: string[];
  trigger?: React.ReactNode;
}

export function AddServiceTranslationDialog({
  serviceId,
  versionId,
  existingLocales,
  trigger,
}: AddServiceTranslationDialogProps) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setLocale("");
      setShowForm(false);
    }
  };

  const handleSetLocale = () => {
    if (!locale.trim()) return;
    if (existingLocales.includes(locale.trim())) return;
    setShowForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Translation</DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Locale code (e.g. en, fr)</Label>
              <Input
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                placeholder="en"
              />
              {existingLocales.includes(locale.trim()) && (
                <p className="text-sm text-destructive">
                  Translation for this locale already exists.
                </p>
              )}
            </div>
            <Button
              onClick={handleSetLocale}
              disabled={
                !locale.trim() || existingLocales.includes(locale.trim())
              }
              className="bg-bcgov-blue hover:bg-bcgov-blue/80"
            >
              Continue
            </Button>
          </div>
        ) : (
          <ServiceTranslationForm
            serviceId={serviceId}
            versionId={versionId}
            locale={locale.trim()}
            isDraft
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
