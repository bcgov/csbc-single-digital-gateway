import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DefinitionEditor } from '@/components/admin/templates/definition-editor';
import {
  addVersion,
  adminTemplateQueryOptions,
  editDraft,
  publishVersion,
  type TemplateVersion,
} from '@/lib/templates';

/** Header dropdown to switch the selected version (newest first). */
function VersionDropdown({
  versions,
  selectedId,
  onSelect,
}: {
  versions: TemplateVersion[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const selected = versions.find((version) => version.id === selectedId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
        Version v{selected?.versionNumber}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.versionNumber}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Admin Template detail — a version dropdown + lifecycle actions in the header, over the JSON
 * content editor.
 *
 * Feature 217: the live JSONForms preview beside the editor is gone with the `@repo/react`
 * renderers. The Monaco editor stays, so a template's content is still authored here until the Form
 * Studio is wired to the documents API.
 */
export function AdminTemplateDetail() {
  const { id } = useParams({ from: '/admin/templates/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(adminTemplateQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });

  const versions = data?.versions ?? [];
  const latest = versions.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((version) => version.id === selectedId) ?? latest;
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (selected) {
      setDraftText(JSON.stringify(selected.content, null, 2));
    }
  }, [selected?.id]);

  const save = useMutation({
    mutationFn: (vars: { versionId: string; text: string }) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(vars.text) as Record<string, unknown>;
      } catch {
        throw new Error('Content is not valid JSON.');
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
    mutationFn: () => addVersion(id, selected?.content ?? {}),
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
  // Dirty = the editor text differs from the selected version's stored content (parse-aware, so
  // invalid JSON always reads dirty — you must fix it before Publish re-enables).
  const selectedJson = selected ? JSON.stringify(selected.content) : '';
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
        to="/admin/templates"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Templates
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* The name is generated from the version content, so it can be absent. */}
          <h2 className="text-lg font-semibold">{latest?.title ?? 'Untitled'}</h2>
          <Badge color="yellow">{data.template.type}</Badge>
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            Content {selected ? `(v${String(selected.versionNumber)})` : ''}
          </span>
          {!isDraft ? (
            <span className="text-xs text-muted-foreground">Read-only (not a draft)</span>
          ) : null}
        </div>
        <DefinitionEditor value={draftText} onChange={setDraftText} readOnly={!isDraft} />
      </div>
    </div>
  );
}
