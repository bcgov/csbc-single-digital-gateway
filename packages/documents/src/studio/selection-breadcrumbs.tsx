import { mdiHome } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Fragment, type ReactNode } from 'react';
import type { PathSegment, SegmentKind } from './selection-path';

/** Paths longer than this collapse to root › ⋯ › parent › current, as Form Studio's do (doc 186 rule 16). */
const MAX_SEGMENTS = 4;
const LABEL_CLASS = 'block max-w-40 truncate';

interface SelectionBreadcrumbsProps {
  segments: readonly PathSegment[];
  /**
   * A Form crumb selects its Form; an element crumb its element on the page; the root crumb clears the selection
   * (`null`). Conditions select nothing.
   */
  onSelect: (id: string | null, kind?: SegmentKind) => void;
}

/**
 * The footer's path to the selection (doc 232 rule 7): the selected Form is the current page, the root and every
 * earlier Form a button, a Condition the route passes through plain text. A long path hides its middle behind a
 * `⋯` menu that lists the hidden crumbs the same way.
 */
export function SelectionBreadcrumbs({ segments, onSelect }: SelectionBreadcrumbsProps) {
  const last = segments.length - 1;
  const collapsed = segments.length > MAX_SEGMENTS;
  const entries: { key: string; node: ReactNode }[] = segments.flatMap((segment, i) => {
    if (collapsed && i > 0 && i < last - 1) {
      return i === 1
        ? [
            {
              key: 'hidden',
              node: <HiddenCrumbs segments={segments.slice(1, -2)} onSelect={onSelect} />,
            },
          ]
        : [];
    }
    return [
      {
        key: segment.id,
        node: <Crumb segment={segment} current={i === last} onSelect={onSelect} />,
      },
    ];
  });

  return (
    <Breadcrumb aria-label="Selection path" className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden text-xs">
        {entries.map(({ key, node }, i) => (
          <Fragment key={key}>
            {i > 0 && <BreadcrumbSeparator />}
            {node}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Crumb({
  segment,
  current,
  onSelect,
}: {
  segment: PathSegment;
  current: boolean;
  onSelect: SelectionBreadcrumbsProps['onSelect'];
}) {
  // A Funnel root draws as a home icon; a Form root is the whole path, so it keeps its name.
  const root = segment.kind === 'funnel';
  const content = root ? <RootLabel label={segment.label} /> : segment.label;
  const className = root ? 'flex items-center' : LABEL_CLASS;
  return (
    <BreadcrumbItem>
      {current ? (
        <BreadcrumbPage title={segment.label} className={className}>
          {content}
        </BreadcrumbPage>
      ) : segment.kind === 'condition' ? (
        <ConditionLabel segment={segment} />
      ) : (
        <BreadcrumbLink
          render={<button type="button" />}
          title={segment.label}
          className={className}
          onClick={() => select(segment, onSelect)}
        >
          {content}
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );
}

/** The home icon of a Funnel root crumb; its label stays as screen-reader text, so it keeps its accessible name. */
function RootLabel({ label }: { label: string }) {
  return (
    <>
      <Icon path={mdiHome} size="14px" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </>
  );
}

/** A Condition the route passes through, with the branch it takes: text, not a button. */
function ConditionLabel({ segment }: { segment: PathSegment }) {
  return (
    <span title={segment.label} data-slot="document-studio-path-condition" className={LABEL_CLASS}>
      {segment.label}
    </span>
  );
}

/** The `⋯` menu of collapsed crumbs: Forms select, Conditions are listed but disabled. */
function HiddenCrumbs({
  segments,
  onSelect,
}: {
  segments: readonly PathSegment[];
  onSelect: SelectionBreadcrumbsProps['onSelect'];
}) {
  return (
    <BreadcrumbItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Show hidden path"
          className="flex items-center rounded-sm hover:text-foreground"
        >
          <BreadcrumbEllipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-auto">
          {segments.map((segment) =>
            segment.kind === 'condition' ? (
              <DropdownMenuItem
                key={segment.id}
                disabled
                title={segment.label}
                className="text-muted-foreground data-disabled:opacity-100"
              >
                <span className={LABEL_CLASS}>{segment.label}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={segment.id}
                title={segment.label}
                onClick={() => select(segment, onSelect)}
              >
                <span className={LABEL_CLASS}>{segment.label}</span>
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}

/** What clicking a crumb selects: a Form or page element by id, else (the root) nothing. */
function select(segment: PathSegment, onSelect: SelectionBreadcrumbsProps['onSelect']) {
  if (segment.kind === 'form' || segment.kind === 'element') onSelect(segment.id, segment.kind);
  else onSelect(null);
}
