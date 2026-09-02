import { cn } from '@ui/lib/utils';
import { mdiLoading } from '@mdi/js';
import { Icon } from '@mdi/react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Icon
      path={mdiLoading}
      size="16px"
      spin
      // `@mdi/react`'s IconProps type doesn't declare `role` (or allow `undefined` on optional
      // fields under this repo's `exactOptionalPropertyTypes`), but the component spreads
      // arbitrary rest props onto the rendered <svg> at runtime — so merge and cast in one shot.
      {...({
        'data-slot': 'spinner',
        role: 'status',
        'aria-label': 'Loading',
        className: cn(className),
        ...props,
      } as Omit<React.ComponentProps<typeof Icon>, 'path' | 'size' | 'spin'>)}
    />
  );
}

export { Spinner };
