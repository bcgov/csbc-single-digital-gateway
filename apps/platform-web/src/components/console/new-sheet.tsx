import { Button } from '@repo/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@repo/ui/sheet';
import { Link } from '@tanstack/react-router';
import { Package, Plus } from 'lucide-react';
import { useState } from 'react';

const CARD =
  'flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary';

function OptionBody({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </>
  );
}

/**
 * Header "New" action — opens a right-side sheet ("Create new") to pick what to add to the active
 * workspace. Disabled until there is one. Service jumps to the services screen (application methods
 * are created from within a service, not here).
 */
export function NewSheet({ slug }: { slug: string | undefined }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const disabled = slug === undefined;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger
        render={
          <Button type="button" size="sm" disabled={disabled}>
            <Plus className="size-4" aria-hidden />
            New
          </Button>
        }
      />
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create new</SheetTitle>
          <SheetDescription>What would you like to add to this workspace?</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Choose a type
          </span>
          <SheetClose
            render={
              <Link to="/app/$slug/services" params={{ slug: slug ?? '' }} className={CARD}>
                <OptionBody
                  icon={Package}
                  title="Service"
                  description="A service-type document that groups related applications citizens interact with."
                />
              </Link>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
