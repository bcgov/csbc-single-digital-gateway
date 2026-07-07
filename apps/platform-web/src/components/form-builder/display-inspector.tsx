import { Button } from '@repo/ui/button';
import { Label } from '@repo/ui/label';
import { AlignCenter, AlignLeft, AlignRight, type LucideIcon } from 'lucide-react';
import type { DisplayNode, HeadingLevel, TextAlign } from './model';

const HEADING_LEVELS: { level: HeadingLevel; label: string }[] = [
  { level: 2, label: 'Heading' },
  { level: 3, label: 'Subheading' },
];

const ALIGNMENTS: { value: TextAlign; label: string; icon: LucideIcon }[] = [
  { value: 'left', label: 'Align left', icon: AlignLeft },
  { value: 'center', label: 'Align center', icon: AlignCenter },
  { value: 'right', label: 'Align right', icon: AlignRight },
];

/**
 * Inspector settings for a selected display-only node. Content itself is edited inline on the canvas
 * (see `display-card.tsx`); this panel holds the field's *configuration* — heading level, paragraph
 * alignment — mirroring how a control's settings live in the inspector.
 */
export function DisplayInspector({
  node,
  onChange,
}: {
  node: DisplayNode;
  onChange: (patch: Partial<DisplayNode>) => void;
}) {
  const contentName = node.displayType === 'richtext' ? 'rich text' : node.displayType;
  return (
    <div className="flex flex-col gap-4">
      {node.displayType === 'heading' ? (
        <div className="flex flex-col gap-1.5">
          <Label>Level</Label>
          <div className="flex gap-2">
            {HEADING_LEVELS.map((option) => {
              const active = (node.level ?? 2) === option.level;
              return (
                <Button
                  key={option.level}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  onClick={() => onChange({ level: option.level })}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      {node.displayType === 'paragraph' ? (
        <div className="flex flex-col gap-1.5">
          <Label>Alignment</Label>
          <div className="flex gap-2">
            {ALIGNMENTS.map((option) => {
              const active = (node.align ?? 'left') === option.value;
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="icon"
                  className="size-8"
                  variant={active ? 'default' : 'outline'}
                  aria-label={option.label}
                  aria-pressed={active}
                  onClick={() => onChange({ align: option.value })}
                >
                  <Icon className="size-4" aria-hidden />
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">Edit the {contentName} content on the canvas.</p>
    </div>
  );
}
