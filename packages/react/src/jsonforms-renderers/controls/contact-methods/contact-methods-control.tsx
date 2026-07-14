import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ControlWrapper } from '../../util/control-wrapper';
import { MethodDialog, type DialogState } from './method-dialog';
import {
  CONTACT_METHOD_META,
  type ContactMethod,
  type ContactMethodType,
  emptyMethod,
  methodDetailLines,
} from './model';

// Dispatched purely by the uischema option `format: 'contact-methods'`, ranked above generic controls.
export const contactMethodsControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'contact-methods')),
);

const CLOSED: DialogState = { open: false, index: null, draft: null };

function ContactMethodsControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  const [dialog, setDialog] = useState<DialogState>(CLOSED);
  if (visible === false) {
    return null;
  }
  const methods: ContactMethod[] = Array.isArray(data) ? (data as ContactMethod[]) : [];
  const disabled = enabled === false;
  const heading = typeof label === 'string' && label.length > 0 ? label : 'Contact methods';

  const commit = (next: ContactMethod[]) => handleChange(path, next);
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= methods.length) {
      return;
    }
    const next = methods.slice();
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) {
      return;
    }
    next[index] = b;
    next[target] = a;
    commit(next);
  };
  const remove = (index: number) => commit(methods.filter((_, i) => i !== index));
  const save = (method: ContactMethod) => {
    commit(
      dialog.index === null
        ? [...methods, method]
        : methods.map((existing, i) => (i === dialog.index ? method : existing)),
    );
    setDialog(CLOSED);
  };

  return (
    <ControlWrapper
      id={id}
      label={false}
      required={required}
      {...(description ? { description } : {})}
      errors={errors}
      labelFor={false}
    >
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-medium text-foreground">
              {heading}
              {required ? ' *' : ''}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setDialog({ open: true, index: null, draft: null })}
            >
              <Plus aria-hidden />
              Add Contact Method
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact method</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No contact methods yet. Use “Add Contact Method” to add one.
                  </TableCell>
                </TableRow>
              ) : (
                methods.map((method, index) => {
                  const meta = CONTACT_METHOD_META[method.type];
                  const Icon = meta.icon;
                  const details = methodDetailLines(method).join(', ');
                  return (
                    // Rows have no stable key; index is safe (reorder rewrites the whole array).
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" aria-hidden />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {method.label || meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{meta.label}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{details || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move up"
                            disabled={disabled || index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ChevronUp aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Move down"
                            disabled={disabled || index === methods.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ChevronDown aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            disabled={disabled}
                            onClick={() => setDialog({ open: true, index, draft: { ...method } })}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            disabled={disabled}
                            onClick={() => remove(index)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <MethodDialog
        state={dialog}
        onPickType={(type: ContactMethodType) =>
          setDialog((current) => ({ ...current, draft: emptyMethod(type) }))
        }
        onSave={save}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(CLOSED);
          }
        }}
      />
    </ControlWrapper>
  );
}

export const ContactMethodsControl = withJsonFormsControlProps(ContactMethodsControlComponent);
