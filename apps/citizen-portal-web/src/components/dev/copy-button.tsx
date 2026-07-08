import { useState } from 'react';
import { mdiCheck, mdiContentCopy } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';

/** Small icon button that copies `text` to the clipboard, flashing a check mark briefly. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
    >
      <Icon path={copied ? mdiCheck : mdiContentCopy} size="16px" aria-hidden={true} />
    </button>
  );
}
