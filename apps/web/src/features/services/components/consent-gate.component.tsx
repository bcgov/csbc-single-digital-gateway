import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Checkbox,
  Label,
  Separator,
} from "@repo/ui";
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { consentDocumentsQueryOptions } from "../data/consent-document.query";
import { useCreateConsentStatements } from "../data/consent-statement.mutation";
import { LexicalContent } from "./lexical-content.component";

interface ConsentGateProps {
  onAgree: () => void;
  documentIds: string[];
}

export function ConsentGate({ onAgree, documentIds }: ConsentGateProps) {
  const { data: documents } = useSuspenseQuery(
    consentDocumentsQueryOptions(documentIds),
  );
  const mutation = useCreateConsentStatements();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked = documents.every((doc) => checked[doc.id]);

  if (documents.length === 0) {
    onAgree();
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Data & privacy</h1>
          <p className="text-muted-foreground">
            To proceed with the application, you will need to agree to the
            following:
          </p>
        </div>
        <Button
          className="bg-bcgov-blue hover:bg-bcgov-blue/80"
          onClick={handleSubmit}
          disabled={!allChecked || mutation.isPending}
        >
          <IconPlayerPlay />
          Start online application
        </Button>
      </div>

      <Separator className="bg-bcgov-gold" />

      <Accordion>
        {documents.map((doc) => (
          <AccordionItem key={doc.id} value={doc.id}>
            <AccordionTrigger>
              <span className="flex items-center justify-between flex-1">
                {doc.name}
                {checked[doc.id] ? (
                  <IconCircleCheckFilled className="size-5 text-green-600 mr-2" />
                ) : (
                  <IconCircleXFilled className="size-5 text-red-600 mr-2" />
                )}
              </span>
            </AccordionTrigger>
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
                  onCheckedChange={(value) =>
                    handleCheckChange(doc.id, Boolean(value))
                  }
                />
                <Label
                  htmlFor={`${doc.id}-accept`}
                  className="font-normal cursor-pointer"
                >
                  {doc.signOff}
                </Label>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
