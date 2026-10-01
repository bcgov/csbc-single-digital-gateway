import { mdiInformationOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/alert';
import { useEffect, useRef } from 'react';
import { CHOOSER_SLOT, type ChoosableOutput } from './use-connect-mode';
import type { NodeOutput } from './funnel-model';

/** The prompt floating centred at the bottom of the canvas while connecting (doc 235 rule 6). */
export function ConnectPrompt() {
  return (
    <Alert
      role="status"
      variant="info"
      data-slot="document-studio-connect-prompt"
      className="absolute bottom-4 left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 shadow-md"
    >
      <Icon path={mdiInformationOutline} size="16px" />
      <AlertTitle>Choose a condition or form to connect</AlertTitle>
      <AlertDescription>Click the background or escape to cancel</AlertDescription>
    </Alert>
  );
}

/**
 * "Connect from" (doc 235 rule 9): on a picked Condition with several free outputs, one item per output in its order.
 * Escape and clicks outside are connect mode's to handle; clicks inside reach the items.
 */
export function OutputChooser({
  outputs,
  onChoose,
}: {
  outputs: readonly ChoosableOutput[];
  onChoose: (output: NodeOutput) => void;
}) {
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div
      role="menu"
      aria-label="Connect from"
      data-slot={CHOOSER_SLOT}
      className="nodrag nopan absolute top-full left-1/2 z-30 mt-2 w-56 -translate-x-1/2 animate-in rounded-md border border-border bg-background p-1 text-sm shadow-md duration-150 fade-in-0 zoom-in-95 motion-reduce:animate-none"
    >
      <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">Connect from</p>
      {outputs.map(({ key, label, output }, i) => (
        <button
          key={key}
          ref={i === 0 ? first : undefined}
          type="button"
          role="menuitem"
          title={label}
          className="block w-full truncate rounded-sm px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
          onClick={() => onChoose(output)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
