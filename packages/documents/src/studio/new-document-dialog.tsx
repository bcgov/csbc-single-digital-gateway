import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { Switch } from '@repo/ui/switch';
import { useId, useState } from 'react';
import {
  DOCUMENT_TYPE_INFO,
  DOCUMENT_TYPES,
  type DocumentKind,
  type DocumentType,
} from './document-types';

export interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselections — e.g. a host that already knows the kind but not the type. */
  kind?: DocumentKind | undefined;
  type?: DocumentType | undefined;
  onCreate: (kind: DocumentKind, type: DocumentType) => void;
}

function isDocumentType(value: unknown): value is DocumentType {
  return (DOCUMENT_TYPES as readonly unknown[]).includes(value);
}

/** Choose a new document's type (choice cards) and whether it is a template. */
export function NewDocumentDialog({
  open,
  onOpenChange,
  kind,
  type,
  onCreate,
}: NewDocumentDialogProps) {
  const id = useId();
  const [chosenType, setChosenType] = useState<DocumentType | undefined>(type);
  const [template, setTemplate] = useState(kind === 'template');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>Choose what you are creating.</DialogDescription>
        </DialogHeader>
        <RadioGroup
          aria-label="Document type"
          value={chosenType ?? null}
          onValueChange={(value) => setChosenType(isDocumentType(value) ? value : undefined)}
        >
          {DOCUMENT_TYPES.map((value) => (
            <FieldLabel key={value} htmlFor={`${id}-${value}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{DOCUMENT_TYPE_INFO[value].label}</FieldTitle>
                  <FieldDescription>{DOCUMENT_TYPE_INFO[value].description}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={value} id={`${id}-${value}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${id}-template`}>This document is a template</FieldLabel>
          <Switch id={`${id}-template`} checked={template} onCheckedChange={setTemplate} />
        </Field>
        <DialogFooter>
          <Button
            disabled={chosenType === undefined}
            onClick={() => {
              if (chosenType === undefined) return;
              onCreate(template ? 'template' : 'document', chosenType);
              onOpenChange(false);
            }}
          >
            Create document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
