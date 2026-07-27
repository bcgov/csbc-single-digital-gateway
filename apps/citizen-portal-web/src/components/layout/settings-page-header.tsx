import { Icon } from '@mdi/react';

/**
 * Shared page header for the citizen settings pages (account, notifications, service agreements):
 * a full-width `bcgov-gold` divider with a light-blue icon badge to the left of the title/subtitle.
 * Render it as a full-width sibling above the constrained page body so the divider spans the page.
 */
export function SettingsPageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b-2 border-bcgov-gold">
      <div className="mx-auto flex w-full max-w-280 items-center gap-4 px-4 py-6 md:px-8">
        <div className="flex items-center justify-center bg-blue-10 p-2">
          <Icon path={icon} size="32px" className="text-blue-80" aria-hidden={true} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
