import { Logo } from '@repo/ui/logo';

/** A labelled column of footer links. */
interface FooterColumn {
  heading: string;
  links: readonly string[];
}

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  { heading: 'Single Digital Gateway', links: ['Home', 'Services', 'Help'] },
  { heading: 'More info', links: ['About gov.bc.ca', 'About CSBC'] },
  {
    heading: 'Legal',
    links: ['Disclaimer', 'Privacy', 'Terms of Service', 'Accessibility', 'Copyright'],
  },
];

/** Land acknowledgement band + brand/columns + copyright. Shared across both landing pages. */
export function SiteFooter() {
  return (
    <footer className="mt-16">
      {/* Land acknowledgement band */}
      <div className="bg-neutral-900 text-neutral-200">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-[11px]/relaxed">
          The B.C. Public Service acknowledges the territories of First Nations around B.C. and is
          grateful to carry out our work on these lands. We acknowledge the rights, interests,
          priorities, and concerns of all Indigenous Peoples — First Nations, Métis, and Inuit —
          respecting and acknowledging their distinct cultures, histories, rights, laws, and
          governments.
        </div>
      </div>

      {/* Brand + link columns */}
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <Logo className="h-8 w-auto" aria-label="Government of British Columbia" />
            <p className="max-w-xs text-[11px]/relaxed text-muted-foreground">
              We can help in over 220 languages and through other accessible options. Call, email or
              text us, or find a service centre.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-foreground">{column.heading}</h2>
              <ul className="flex flex-col gap-1.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-xs text-muted-foreground hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10 border-t pt-6 text-[11px] text-muted-foreground">
          © 2027 Government of British Columbia.
        </p>
      </div>
    </footer>
  );
}
