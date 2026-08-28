import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@ui/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=default]:h-5 data-[size=default]:w-10 data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] not-data-disabled:hover:cursor-pointer not-data-disabled:data-checked:bg-primary not-data-disabled:data-checked:hover:bg-primary-hover not-data-disabled:data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:bg-secondary-hover',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full border-2 border-border-medium bg-background ring-0 transition-all group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 group-hover/switch:data-unchecked:border-border-dark"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
