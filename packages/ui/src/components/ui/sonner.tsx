'use client';

import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';
import { mdiCheckCircle, mdiInformation, mdiAlert, mdiCloseOctagon, mdiLoading } from '@mdi/js';
import { Icon } from '@mdi/react';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <Icon path={mdiCheckCircle} size="16px" />,
        info: <Icon path={mdiInformation} size="16px" />,
        warning: <Icon path={mdiAlert} size="16px" />,
        error: <Icon path={mdiCloseOctagon} size="16px" />,
        loading: <Icon path={mdiLoading} size="16px" spin />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

/**
 * Re-exported so a consumer never imports `sonner` itself. `toast()` talks to the mounted `Toaster` through a
 * module-level store, so two copies of the package would leave one of them mute; going through `@repo/ui`
 * guarantees the caller and the host share one.
 */
export { Toaster, toast };
