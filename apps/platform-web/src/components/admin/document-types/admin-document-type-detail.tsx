import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DefinitionPreview,
  type PreviewMode,
} from '@/components/admin/document-types/definition-preview';
import { DefinitionEditor } from '@/components/admin/document-types/definition-editor';
import {
  addVersion,
  adminDocumentTypeQueryOptions,
  type DocumentTypeVersion,
  editDraft,
  publishVersion,
} from '@/lib/document-types';

/** Header dropdown to switch the selected version (newest first) — mirrors the service editor's
 * `VersionPicker`, typed for document-type versions. */
function VersionDropdown({
  versions,
  selectedId,
  onSelect,
}: {
  versions: DocumentTypeVersion[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const selected = versions.find((version) => version.id === selectedId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
        Version v{selected?.version}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.version}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Admin Document Type detail — a version dropdown + lifecycle actions in the header, with the JSON
 * definition editor on the left and a live JSONForms preview on the right. */
export function AdminDocumentTypeDetail() {
  const { id } = useParams({ from: '/admin/document-types/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(adminDocumentTypeQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'document-types'] });

  const versions = data?.versions ?? [];
  const latest = versions.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((version) => version.id === selectedId) ?? latest;
  const [draftText, setDraftText] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('interactive');

  useEffect(() => {
    if (selected) {
      setDraftText(JSON.stringify(selected.definition, null, 2));
    }
  }, [selected?.id]);

  const save = useMutation({
    mutationFn: (vars: { versionId: string; text: string }) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(vars.text) as Record<string, unknown>;
      } catch {
        throw new Error('Definition is not valid JSON.');
      }
      return editDraft(id, vars.versionId, parsed);
    },
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: (versionId: string) => publishVersion(id, versionId),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: () => addVersion(id, selected?.definition ?? {}),
    onSuccess: async (version) => {
      setSelectedId(version.id);
      await invalidate();
    },
  });
  const busy = save.isPending || publish.isPending || add.isPending;

  if (!data) {
    return null;
  }

  const isDraft = selected?.status === 'draft';
  const isLatest = selected?.id === latest?.id;
  // Dirty = the editor text differs from the selected version's stored definition (parse-aware, so
  // invalid JSON always reads dirty — you must fix it before Publish re-enables). Mirrors ServiceDetail.
  const selectedJson = selected ? JSON.stringify(selected.definition) : '';
  let parsedText: unknown;
  let parseOk = true;
  try {
    parsedText = JSON.parse(draftText);
  } catch {
    parseOk = false;
  }
  const dirty = selected !== undefined && (!parseOk || JSON.stringify(parsedText) !== selectedJson);

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
      <Link
        to="/admin/document-types"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Document types
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{data.type.name}</h2>
          <Badge color="yellow">{data.type.kind}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {save.isError ? (
            <p role="alert" className="mr-auto text-sm text-destructive">
              {save.error.message}
            </p>
          ) : null}
          {/* Editing a draft → Save draft / Publish, left of the version controls. */}
          {isDraft && selected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={!dirty || busy}
                onClick={() => save.mutate({ versionId: selected.id, text: draftText })}
              >
                Save draft
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={dirty || busy}
                onClick={() => publish.mutate(selected.id)}
              >
                Publish
              </Button>
            </>
          ) : null}
          <ButtonGroup>
            {!isLatest && latest ? (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setSelectedId(latest.id)}
              >
                Go to current
              </Button>
            ) : null}
            {selected ? (
              <VersionDropdown
                versions={versions}
                selectedId={selected.id}
                onSelect={setSelectedId}
              />
            ) : null}
          </ButtonGroup>
          {/* Latest version, not a draft → start a new draft version. */}
          {isLatest && !isDraft ? (
            <Button size="sm" type="button" disabled={add.isPending} onClick={() => add.mutate()}>
              <Plus className="size-4" aria-hidden />
              New version
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Definition {selected ? `(v${selected.version})` : ''}
            </span>
            {!isDraft ? (
              <span className="text-xs text-muted-foreground">Read-only (not a draft)</span>
            ) : null}
          </div>
          <DefinitionEditor value={draftText} onChange={setDraftText} readOnly={!isDraft} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Preview</span>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[previewMode]}
              onValueChange={(values: string[]) =>
                setPreviewMode(
                  (values.find((v) => v !== previewMode) ?? previewMode) as PreviewMode,
                )
              }
            >
              <ToggleGroupItem value="interactive">Interactive</ToggleGroupItem>
              <ToggleGroupItem value="readonly">Read-only</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <DefinitionPreview text={draftText} mode={previewMode} />
        </div>
      </div>
    </div>
  );
}
