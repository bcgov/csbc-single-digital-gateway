import { Logo } from '@repo/ui/logo';

/** A labelled column of footer links. */
interface FooterColumn {
  heading: string;
  links: readonly { text: string; href: string }[];
}

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'Single Digital Gateway',
    links: [
      { text: 'Home', href: '/' },
      { text: 'Services', href: '/services' },
      { text: 'Help', href: 'https://www2.gov.bc.ca/gov/content/home/get-help-with-gov-bc' },
    ],
  },
  {
    heading: 'More info',
    links: [
      { text: 'About gov.bc.ca', href: 'https://www2.gov.bc.ca/gov/content/about-gov-bc-ca' },
      {
        text: 'About CSBC',
        href: 'https://www2.gov.bc.ca/gov/content/governments/organizational-structure/ministries-organizations/central-government-agencies/csbc',
      },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { text: 'Disclaimer', href: 'https://www2.gov.bc.ca/gov/content/home/disclaimer' },
      { text: 'Privacy', href: 'https://www2.gov.bc.ca/gov/content/home/privacy' },
      {
        text: 'Terms of Service',
        href: 'https://www2.gov.bc.ca/gov/content/governments/services-for-government/information-management-technology/information-security/cyber-bc/terms-of-use',
      },
      {
        text: 'Accessibility',
        href: 'https://www2.gov.bc.ca/gov/content/home/accessible-government',
      },
      { text: 'Copyright', href: 'https://www2.gov.bc.ca/gov/content/home/copyright' },
    ],
  },
];

/** Land acknowledgement band + brand/columns + copyright. Shared across both landing pages. */
export function SiteFooter() {
  return (
    <footer className="mt-16">
      {/* Land acknowledgement band */}
      <div className="bg-neutral-900 text-neutral-200 border-t-3 border-b-3 border-[#FCBA19]">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-[14px]/relaxed">
          The B.C. Public Service acknowledges the territories of First Nations around B.C. and is
          grateful to carry out our work on these lands. We acknowledge the rights, interests,
          priorities, and concerns of all Indigenous Peoples — First Nations, Métis, and Inuit —
          respecting and acknowledging their distinct cultures, histories, rights, laws, and
          governments.
        </div>
      </div>

      {/* Brand + link columns */}
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-row justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div>
              <Logo className="h-10 w-auto" aria-label="Government of British Columbia" />
            </div>
            <p className="max-w-xs text-[14px]/relaxed text-muted-foreground">
              We can help in over 220 languages and through other accessible options.{' '}
              <a
                href="https://www2.gov.bc.ca/gov/content/home/get-help-with-government-services"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-500"
              >
                Call, email or text us
              </a>
              , or{' '}
              <a
                href="https://www2.gov.bc.ca/gov/content/home/services-a-z"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-gray-500"
              >
                find a service centre
              </a>
              .
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-foreground">{column.heading}</h2>
                <ul className="flex flex-col gap-1.5">
                  {column.links.map((link) => (
                    <li key={link.text}>
                      <a
                        href={link.href}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <p className="mt-10 border-t pt-6 text-[11px] text-muted-foreground">
          © 2027 Government of British Columbia.
        </p>
      </div>
    </footer>
  );
}
