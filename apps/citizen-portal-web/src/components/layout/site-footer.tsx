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
    <footer className="mt-16 flex flex-col">
      {/* Land acknowledgement band */}
      <div className="bg-gray-110 text-white text-sm border-y-4 border-gold-60">
        <div className="my-8 mx-auto px-4 md:px-8 w-full max-w-280 flex flex-col gap-9">
          The B.C. Public Service acknowledges the territories of First Nations around B.C. and is
          grateful to carry out our work on these lands. We acknowledge the rights, interests,
          priorities, and concerns of all Indigenous Peoples — First Nations, Métis, and Inuit —
          respecting and acknowledging their distinct cultures, histories, rights, laws, and
          governments.
        </div>
      </div>

      {/* Brand + link columns */}
      <div className="my-6 mx-auto px-4 md:px-8 w-full max-w-280 flex flex-col gap-9">
        <div className="grid gap-8 md:grid-cols-[3fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-6">
            <Logo className="h-14 w-auto self-start" aria-label="Government of British Columbia" />
            <p className="max-w-xs text-sm text-secondary-foreground">
              We can help in over 220 languages and through other accessible options. Call, email or
              text us, or find a service centre.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
              <p className="text-xs font-semibold">{column.heading}</p>
              <ul className="flex flex-col gap-1.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-foreground no-underline hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="border-t border-border-dark pt-9 text-sm text-secondary-foreground">
          &copy; {new Date().getFullYear()} Government of British Columbia.
        </p>
      </div>
    </footer>
  );
}
