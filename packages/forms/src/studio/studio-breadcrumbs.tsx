import { mdiFileDocumentOutline } from '@mdi/js';
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
import { collapsePath, type PathSegment } from './layout/element-path';

// Paths longer than this collapse to root › ⋯ › parent › current (doc 186 rule 16).
const MAX_SEGMENTS = 4;
const LABEL_CLASS = 'block max-w-40 truncate';
const ROOT_CLASS = 'flex items-center';

interface Handlers {
  onHover(elementId: string | null): void;
  onSelect(elementId: string): void;
}

interface StudioBreadcrumbsProps extends Handlers {
  readonly segments: readonly PathSegment[];
  /** The selected element's id — its segment is the current page — or `null` when nothing is selected. */
  readonly currentId: string | null;
}

/** Hovering a segment hovers its element; leaving clears hover (rule 12). */
const hoverHandlers = (elementId: string, { onHover }: Handlers) => ({
  onPointerEnter: () => onHover(elementId),
  onPointerLeave: () => onHover(null),
});

/**
 * One segment: the selected element's is the current page, any other a button. The root shows a document
 * icon named by its label instead of the label text (rule 10b).
 */
function Segment({
  segment,
  current,
  root,
  handlers,
}: {
  segment: PathSegment;
  current: boolean;
  root: boolean;
  handlers: Handlers;
}) {
  const shared = {
    title: segment.label,
    className: root ? ROOT_CLASS : LABEL_CLASS,
    ...(root ? { 'aria-label': segment.label } : {}),
    ...hoverHandlers(segment.id, handlers),
  };
  const content = root ? <Icon path={mdiFileDocumentOutline} size="14px" /> : segment.label;
  return (
    <BreadcrumbItem>
      {current ? (
        <BreadcrumbPage {...shared}>{content}</BreadcrumbPage>
      ) : (
        <BreadcrumbLink
          render={<button type="button" />}
          onClick={() => handlers.onSelect(segment.id)}
          {...shared}
        >
          {content}
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );
}

/** The `⋯` menu of collapsed segments, marked so the studio's pointer listeners leave it alone (rules 15-16). */
function HiddenSegments({
  segments,
  handlers,
}: {
  segments: readonly PathSegment[];
  handlers: Handlers;
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
        <DropdownMenuContent data-studio-breadcrumbs="" side="top" className="w-auto">
          {segments.map((segment) => (
            <DropdownMenuItem
              key={segment.id}
              title={segment.label}
              onClick={() => handlers.onSelect(segment.id)}
              {...hoverHandlers(segment.id, handlers)}
            >
              <span className={LABEL_CLASS}>{segment.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}

/**
 * The Form Studio footer's element path (doc 186 rules 8-16): the root, each ancestor, then the selected
 * element as the current page — or the root alone when nothing is selected. Every other segment is a
 * button that selects its element; every segment hovers its element. `data-studio-breadcrumbs` keeps the
 * studio's document pointer listeners from overriding that hover.
 */
export function StudioBreadcrumbs({ segments, currentId, ...handlers }: StudioBreadcrumbsProps) {
  const { leading, hidden, trailing } = collapsePath(segments, MAX_SEGMENTS);
  const rootId = segments[0]?.id;
  const segment = (item: PathSegment) => ({
    key: item.id,
    node: (
      <Segment
        segment={item}
        current={item.id === currentId}
        root={item.id === rootId}
        handlers={handlers}
      />
    ),
  });
  const entries: { key: string; node: ReactNode }[] = [
    ...leading.map(segment),
    ...(hidden.length > 0
      ? [{ key: 'hidden', node: <HiddenSegments segments={hidden} handlers={handlers} /> }]
      : []),
    ...trailing.map(segment),
  ];

  return (
    <Breadcrumb aria-label="Element path" data-studio-breadcrumbs="" className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {entries.map(({ key, node }, index) => (
          <Fragment key={key}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            {node}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
