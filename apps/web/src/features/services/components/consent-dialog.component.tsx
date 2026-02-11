import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Checkbox,
  Label,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { consentDocumentsQueryOptions } from "../data/consent-document.query";
import { useCreateConsentStatements } from "../data/consent-statement.mutation";
import { LexicalContent } from "./lexical-content.component";

interface ConsentGateProps {
  open: boolean;
  onAgree: () => void;
  onDisagree: () => void;
  documentIds: string[];
}

export function ConsentGate({
  open,
  onAgree,
  onDisagree,
  documentIds,
}: ConsentGateProps) {
  const { data: documents } = useSuspenseQuery(
    consentDocumentsQueryOptions(documentIds),
  );
  const mutation = useCreateConsentStatements();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked = documents.every((doc) => checked[doc.id]);

  if (documents.length === 0) {
    if (open) onAgree();
    return null;
  }

  const handleCheckChange = (docId: string, value: boolean) => {
    setChecked((prev) => ({ ...prev, [docId]: value }));
  };

  const handleSubmit = async () => {
    const entries = documents.map((doc) => ({
      document: doc,
      status: "granted" as const,
    }));

    await mutation.mutateAsync(entries);
    onAgree();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Consent & Privacy</AlertDialogTitle>
          <AlertDialogDescription>
            Before proceeding with your application, please review and agree to
            the following consent and privacy terms. We collect and share your
            information to provide you with efficient government services.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <Accordion>
            {documents.map((doc) => (
              <AccordionItem key={doc.id} value={doc.id}>
                <AccordionTrigger>{doc.name}</AccordionTrigger>
                <AccordionContent>
                  {doc.content ? (
                    <LexicalContent content={doc.content} />
                  ) : (
                    <p className="text-muted-foreground italic">
                      No content available.
                    </p>
                  )}

                  <div className="mt-4 border-t pt-4 flex items-center gap-2">
                    <Checkbox
                      id={`${doc.id}-accept`}
                      checked={checked[doc.id] ?? false}
                      onCheckedChange={(value) => handleCheckChange(doc.id, Boolean(value))}
                    />
                    <Label htmlFor={`${doc.id}-accept`} className="font-normal cursor-pointer">
                      {doc.signOff}
                    </Label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            className="flex-1 py-3 bg-bcgov-blue hover:bg-bcgov-blue/80"
            onClick={handleSubmit}
            disabled={!allChecked || mutation.isPending}
          >
            Submit Responses
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
