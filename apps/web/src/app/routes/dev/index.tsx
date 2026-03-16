import {
  IconArrowRight,
  IconExternalLink,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  buttonVariants,
} from "@repo/ui";

import { IconCake } from "@tabler/icons-react";
import { ExternalLink } from "../../../features/services/components/external-link.component";
import { NavLinkItem } from "../../../features/services/components/nav-link.component";

export const Route = createFileRoute("/dev/")({
  component: TailwindReferencePage,
});

type ColorSwatchItem = {
  step: number;
  bg: string;
  text: string;
  border: string;
  cssVar: string;
};

type SemanticSurfaceItem = {
  label: string;
  className: string;
};

type StatusTokenGroup = {
  name: string;
  surfaceClass: string;
  borderClass: string;
  textClass: string;
};

const blueSwatches: ColorSwatchItem[] = [
  {
    step: 10,
    bg: "bg-blue-10",
    text: "text-blue-10",
    border: "border-blue-10",
    cssVar: "--color-blue-10",
  },
  {
    step: 20,
    bg: "bg-blue-20",
    text: "text-blue-20",
    border: "border-blue-20",
    cssVar: "--color-blue-20",
  },
  {
    step: 30,
    bg: "bg-blue-30",
    text: "text-blue-30",
    border: "border-blue-30",
    cssVar: "--color-blue-30",
  },
  {
    step: 40,
    bg: "bg-blue-40",
    text: "text-blue-40",
    border: "border-blue-40",
    cssVar: "--color-blue-40",
  },
  {
    step: 50,
    bg: "bg-blue-50",
    text: "text-blue-50",
    border: "border-blue-50",
    cssVar: "--color-blue-50",
  },
  {
    step: 60,
    bg: "bg-blue-60",
    text: "text-blue-60",
    border: "border-blue-60",
    cssVar: "--color-blue-60",
  },
  {
    step: 70,
    bg: "bg-blue-70",
    text: "text-blue-70",
    border: "border-blue-70",
    cssVar: "--color-blue-70",
  },
  {
    step: 80,
    bg: "bg-blue-80",
    text: "text-blue-80",
    border: "border-blue-80",
    cssVar: "--color-blue-80",
  },
  {
    step: 90,
    bg: "bg-blue-90",
    text: "text-blue-90",
    border: "border-blue-90",
    cssVar: "--color-blue-90",
  },
  {
    step: 100,
    bg: "bg-blue-100",
    text: "text-blue-100",
    border: "border-blue-100",
    cssVar: "--color-blue-100",
  },
];

const goldSwatches: ColorSwatchItem[] = [
  {
    step: 10,
    bg: "bg-gold-10",
    text: "text-gold-10",
    border: "border-gold-10",
    cssVar: "--color-gold-10",
  },
  {
    step: 20,
    bg: "bg-gold-20",
    text: "text-gold-20",
    border: "border-gold-20",
    cssVar: "--color-gold-20",
  },
  {
    step: 30,
    bg: "bg-gold-30",
    text: "text-gold-30",
    border: "border-gold-30",
    cssVar: "--color-gold-30",
  },
  {
    step: 40,
    bg: "bg-gold-40",
    text: "text-gold-40",
    border: "border-gold-40",
    cssVar: "--color-gold-40",
  },
  {
    step: 50,
    bg: "bg-gold-50",
    text: "text-gold-50",
    border: "border-gold-50",
    cssVar: "--color-gold-50",
  },
  {
    step: 60,
    bg: "bg-gold-60",
    text: "text-gold-60",
    border: "border-gold-60",
    cssVar: "--color-gold-60",
  },
  {
    step: 70,
    bg: "bg-gold-70",
    text: "text-gold-70",
    border: "border-gold-70",
    cssVar: "--color-gold-70",
  },
  {
    step: 80,
    bg: "bg-gold-80",
    text: "text-gold-80",
    border: "border-gold-80",
    cssVar: "--color-gold-80",
  },
  {
    step: 90,
    bg: "bg-gold-90",
    text: "text-gold-90",
    border: "border-gold-90",
    cssVar: "--color-gold-90",
  },
  {
    step: 100,
    bg: "bg-gold-100",
    text: "text-gold-100",
    border: "border-gold-100",
    cssVar: "--color-gold-100",
  },
];

const graySwatches: ColorSwatchItem[] = [
  {
    step: 10,
    bg: "bg-gray-10",
    text: "text-gray-10",
    border: "border-gray-10",
    cssVar: "--color-gray-10",
  },
  {
    step: 20,
    bg: "bg-gray-20",
    text: "text-gray-20",
    border: "border-gray-20",
    cssVar: "--color-gray-20",
  },
  {
    step: 30,
    bg: "bg-gray-30",
    text: "text-gray-30",
    border: "border-gray-30",
    cssVar: "--color-gray-30",
  },
  {
    step: 40,
    bg: "bg-gray-40",
    text: "text-gray-40",
    border: "border-gray-40",
    cssVar: "--color-gray-40",
  },
  {
    step: 50,
    bg: "bg-gray-50",
    text: "text-gray-50",
    border: "border-gray-50",
    cssVar: "--color-gray-50",
  },
  {
    step: 60,
    bg: "bg-gray-60",
    text: "text-gray-60",
    border: "border-gray-60",
    cssVar: "--color-gray-60",
  },
  {
    step: 70,
    bg: "bg-gray-70",
    text: "text-gray-70",
    border: "border-gray-70",
    cssVar: "--color-gray-70",
  },
  {
    step: 80,
    bg: "bg-gray-80",
    text: "text-gray-80",
    border: "border-gray-80",
    cssVar: "--color-gray-80",
  },
  {
    step: 90,
    bg: "bg-gray-90",
    text: "text-gray-90",
    border: "border-gray-90",
    cssVar: "--color-gray-90",
  },
  {
    step: 100,
    bg: "bg-gray-100",
    text: "text-gray-100",
    border: "border-gray-100",
    cssVar: "--color-gray-100",
  },
];

const semanticSurfaceExamples: SemanticSurfaceItem[] = [
  {
    label: "bg-background text-foreground",
    className: "bg-background text-foreground",
  },
  {
    label: "bg-card text-card-foreground",
    className: "bg-card text-card-foreground",
  },
  {
    label: "bg-popover text-popover-foreground",
    className: "bg-popover text-popover-foreground",
  },
  {
    label: "bg-primary text-primary-foreground",
    className: "bg-primary text-primary-foreground",
  },
  {
    label: "bg-secondary text-secondary-foreground",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    label: "bg-accent text-accent-foreground",
    className: "bg-accent text-accent-foreground",
  },
  {
    label: "bg-muted text-muted-foreground",
    className: "bg-muted text-muted-foreground",
  },
  {
    label: "bg-destructive text-primary-foreground",
    className: "bg-destructive text-primary-foreground",
  },
];

const statusTokenGroups: StatusTokenGroup[] = [
  {
    name: "info",
    surfaceClass: "bg-info-surface",
    borderClass: "border-info-border",
    textClass: "text-info-text",
  },
  {
    name: "success",
    surfaceClass: "bg-success-surface",
    borderClass: "border-success-border",
    textClass: "text-success-text",
  },
  {
    name: "warning",
    surfaceClass: "bg-warning-surface",
    borderClass: "border-warning-border",
    textClass: "text-warning-text",
  },
  {
    name: "danger",
    surfaceClass: "bg-danger-surface",
    borderClass: "border-danger-border",
    textClass: "text-danger-text",
  },
];

function TailwindReferencePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">Developer reference</p>
          <h1 className="text-3xl">Tailwind Helper Class Reference</h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            A practical one-pager showing common helpers in this app, alongside
            rendered examples and copyable patterns.
          </p>
        </header>

        <Section
          title="Color palette"
          description="BCDS ramp colors exposed as Tailwind utilities. The brand helpers bg-bcgov-blue / text-bcgov-blue and bg-bcgov-gold / text-bcgov-gold also exist. Muted is mapped onto the gray ramp."
        >
          <div className="space-y-8">
            <ColorPaletteRow name="blue" swatches={blueSwatches} />
            <ColorPaletteRow name="gold" swatches={goldSwatches} />
            <ColorPaletteRow name="gray" swatches={graySwatches} />

            <div className="grid gap-4 md:grid-cols-2">
              <MiniHelperCard
                title="Brand helpers"
                lines={[
                  "bg-bcgov-blue / text-bcgov-blue / border-bcgov-blue",
                  "bg-bcgov-gold / text-bcgov-gold / border-bcgov-gold",
                ]}
              />

              <MiniHelperCard
                title="Muted + neutral note"
                lines={[
                  "'*-muted', '*-muted-foreground' and '*-neutral-*' map to BCDS colours",
                  "in order to easily maintain shadcn compatibility.",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Background and semantic color helpers"
          description="Core semantic surfaces on the left, status/support tokens on the right."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h3>Core semantic surfaces</h3>
              <div className="grid gap-3">
                {semanticSurfaceExamples.map((item) => (
                  <div
                    key={item.label}
                    className="grid gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0 md:grid-cols-[280px_minmax(0,1fr)] md:items-center"
                  >
                    <code className="text-sm font-semibold text-bcgov-blue">
                      {item.label}
                    </code>
                    <div
                      className={`rounded-md border border-border px-4 py-3 ${item.className}`}
                    >
                      Example surface
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3>Status / support tokens</h3>
              <div className="grid gap-4">
                {statusTokenGroups.map((group) => (
                  <StatusTokenCard key={group.name} group={group} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Typography"
          description="HTML headings are intentionally smaller than the raw BCDS heading scale. The utility classes still expose the original token-backed sizes. font-semibold maps to bold because BC Sans does not include a semibold weight."
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <h3>Heading elements vs utility classes</h3>
              <div className="grid gap-4">
                <HeadingComparisonRow
                  label="<h1>"
                  elementPreview={<h1>Heading level 1</h1>}
                  classLabel="text-h1 font-bold"
                  classPreview={
                    <div className="text-h1 font-bold">Utility heading 1</div>
                  }
                />
                <HeadingComparisonRow
                  label="<h2>"
                  elementPreview={<h2>Heading level 2</h2>}
                  classLabel="text-h2 font-bold"
                  classPreview={
                    <div className="text-h2 font-bold">Utility heading 2</div>
                  }
                />
                <HeadingComparisonRow
                  label="<h3>"
                  elementPreview={<h3>Heading level 3</h3>}
                  classLabel="text-h3 font-bold"
                  classPreview={
                    <div className="text-h3 font-bold">Utility heading 3</div>
                  }
                />
                <HeadingComparisonRow
                  label="<h4>"
                  elementPreview={<h4>Heading level 4</h4>}
                  classLabel="text-h4 font-bold"
                  classPreview={
                    <div className="text-h4 font-bold">Utility heading 4</div>
                  }
                />
                <HeadingComparisonRow
                  label="<h5>"
                  elementPreview={<h5>Heading level 5 (same as H4)</h5>}
                  classLabel="text-h5 font-bold"
                  classPreview={
                    <div className="text-h5 font-bold">
                      Utility heading 5 (same as H4)
                    </div>
                  }
                />
                <HeadingComparisonRow
                  label="<h6>"
                  elementPreview={<h6>Heading level 6 (same as H4)</h6>}
                  classLabel="text-lg font-bold"
                  classPreview={
                    <div className="text-lg font-bold">
                      Utility heading 6 (same as H4)
                    </div>
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3>Common text helpers</h3>
              <div className="grid gap-4">
                <TypeRow
                  label="text-sm"
                  preview={<div className="text-sm">Small body text</div>}
                />
                <TypeRow
                  label="text-base"
                  preview={<div className="text-base">Base body text</div>}
                />
                <TypeRow
                  label="text-lg"
                  preview={<div className="text-lg">Large body text</div>}
                />
                <TypeRow
                  label="text-xl"
                  preview={<div className="text-xl">Extra large body text</div>}
                />
                <TypeRow
                  label="text-2xl"
                  preview={
                    <div className="text-2xl">2x Extra large body text</div>
                  }
                />
                <TypeRow
                  label="text-display"
                  preview={<div className="text-display">Display text</div>}
                />
                <TypeRow
                  label="font-normal"
                  preview={<div className="font-normal">Normal weight</div>}
                />
                <TypeRow
                  label="font-semibold"
                  note="Maps to bold in BC Sans."
                  preview={
                    <div className="font-semibold">
                      Semibold helper (renders bold)
                    </div>
                  }
                />
                <TypeRow
                  label="font-bold"
                  preview={<div className="font-bold">Bold weight</div>}
                />
                <TypeRow
                  label="text-link underline"
                  preview={
                    <div className="text-link underline underline-offset-3">
                      Link-styled text
                    </div>
                  }
                />
                <TypeRow
                  label="text-muted-foreground"
                  preview={
                    <div className="text-muted-foreground">Muted text</div>
                  }
                />
                <TypeRow
                  label="text-disabled"
                  preview={<div className="text-disabled">Disabled text</div>}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Spacing, borders, radius, and shadows"
          description="Default Tailwind spacing uses a 0.25rem / 4px step. So p-4 = 1rem / 16px, gap-6 = 1.5rem / 24px, and so on."
        >
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h3>Spacing helpers</h3>
              <p className="text-sm text-muted-foreground">
                All the usual Tailwind spacing helpers work off the same 4px
                multiplier: <code>p-*</code>, <code>px-*</code>,{" "}
                <code>py-*</code>, <code>m-*</code>, <code>gap-*</code>, and{" "}
                <code>space-*</code>.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <SpacingDemoCard
                  title="Padding"
                  code="p-4 / px-6 py-3"
                  preview={
                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="rounded border border-border bg-background px-6 py-3">
                        Inner content
                      </div>
                    </div>
                  }
                />
                <SpacingDemoCard
                  title="Margin"
                  code="m-4"
                  preview={
                    <div className="rounded-md border border-dashed border-border bg-background p-2">
                      <div className="m-4 rounded border border-border bg-card px-4 py-3">
                        Margined block
                      </div>
                    </div>
                  }
                />
                <SpacingDemoCard
                  title="Gap"
                  code="grid gap-4"
                  preview={
                    <div className="grid grid-cols-3 gap-4 rounded-md border border-border bg-background p-4">
                      <div className="rounded border border-border bg-card px-3 py-2 text-center">
                        A
                      </div>
                      <div className="rounded border border-border bg-card px-3 py-2 text-center">
                        B
                      </div>
                      <div className="rounded border border-border bg-card px-3 py-2 text-center">
                        C
                      </div>
                    </div>
                  }
                />
                <SpacingDemoCard
                  title="Space between"
                  code="space-y-4"
                  preview={
                    <div className="space-y-4 rounded-md border border-border bg-background p-4">
                      <div className="rounded border border-border bg-card px-3 py-2">
                        Item 1
                      </div>
                      <div className="rounded border border-border bg-card px-3 py-2">
                        Item 2
                      </div>
                      <div className="rounded border border-border bg-card px-3 py-2">
                        Item 3
                      </div>
                    </div>
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3>Foundation helpers</h3>

              <MiniPreviewRow
                label="Borders"
                code="border / border-2 / border-4 / border-border"
                preview={
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-md border bg-card px-3 py-2">
                      1px
                    </div>
                    <div className="rounded-md border-2 border-border bg-card px-3 py-2">
                      2px
                    </div>
                    <div className="rounded-md border-4 border-border bg-card px-3 py-2">
                      4px
                    </div>
                  </div>
                }
              />

              <MiniPreviewRow
                label="Radius"
                code="rounded-none / rounded-sm / rounded-md / rounded-lg / rounded-full"
                preview={
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-none border border-border bg-card px-3 py-2">
                      none
                    </div>
                    <div className="rounded-sm border border-border bg-card px-3 py-2">
                      sm
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2">
                      md
                    </div>
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      lg
                    </div>
                    <div className="rounded-full border border-border bg-card px-3 py-2">
                      full
                    </div>
                  </div>
                }
              />

              <MiniPreviewRow
                label="Shadows"
                code="shadow-none / shadow-sm / shadow-md / shadow-lg"
                preview={
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-none">
                      none
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-sm">
                      sm
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-md">
                      md
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
                      lg
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </Section>

        <Section
          title="Structure"
          description="Standard Tailwind layout patterns used in the app. The custom project breakpoints are md = 36rem (576px), lg = 62rem (992px), and xl = 75rem (1200px)."
        >
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <CodeExampleCard
                title="Basic one-column layout"
                code={`<div className="space-y-6">
  <section>Section 1</section>
  <section>Section 2</section>
  <section>Section 3</section>
</div>`}
                preview={
                  <div className="space-y-4 rounded-md border border-border bg-background p-4">
                    <div className="rounded-md border border-border bg-card px-4 py-3">
                      Section 1
                    </div>
                    <div className="rounded-md border border-border bg-card px-4 py-3">
                      Section 2
                    </div>
                    <div className="rounded-md border border-border bg-card px-4 py-3">
                      Section 3
                    </div>
                  </div>
                }
              />

              <CodeExampleCard
                title="Basic two-column layout"
                code={`<div className="lg:grid lg:grid-cols-3 gap-12">
  <div className="col-span-2">Column 1</div>
  <div className="col-span-1">Column 2</div>
</div>`}
                preview={
                  <div className="rounded-md border border-border bg-background p-4">
                    <div className="grid gap-4 lg:grid-cols-3 lg:gap-12">
                      <div className="rounded-md border border-border bg-card px-4 py-3 lg:col-span-2">
                        Column 1
                      </div>
                      <div className="rounded-md border border-border bg-card px-4 py-3 lg:col-span-1">
                        Column 2
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <BreakpointCard name="md" value="36rem / 576px" />
              <BreakpointCard name="lg" value="62rem / 992px" />
              <BreakpointCard name="xl" value="75rem / 1200px" />
            </div>
          </div>
        </Section>

        <Section
          title="Groupings"
          description="Repeating layouts we use in the app."
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <h3>Variants in use</h3>

              <ComponentDemoCard
                title="Two columns 1:1"
                code={`<div class="flex flex-col gap-px border bg-border">
	<div class="grid grid-cols-2 gap-px">
		<div class="bg-white p-4"> </div>
		<div class="bg-white p-4"> </div>
	</div>
</div>`}
              >
                <div className="flex flex-col gap-px border bg-border">
                  <div className="grid grid-cols-2 gap-px">
                    <div className="bg-white p-4">
                      <p>Left column - Equal width</p>
                    </div>
                    <div className="bg-white p-4">
                      <p>Right column - Equal width</p>
                    </div>
                  </div>
                </div>
              </ComponentDemoCard>
              <ComponentDemoCard
                title="Two columns 1:2"
                code={`<div class="flex flex-col gap-px border bg-border">
	<div class="grid grid-cols-3 gap-px">
		<div class="bg-white p-4"> </div>
		<div class="bg-white p-4 col-span-2"> </div>
	</div>
</div>`}
              >
                <div className="flex flex-col gap-px border bg-border">
                  <div className="grid grid-cols-3 gap-px">
                    <div className="bg-white p-4">
                      <p>Left column - 1/3 width</p>
                    </div>
                    <div className="bg-white p-4 col-span-2">
                      <p>Right column - 2/3 width</p>
                    </div>
                  </div>
                </div>
              </ComponentDemoCard>
              <ComponentDemoCard
                title="One column"
                code={`<div class="flex flex-col gap-px border bg-border">
	<div class="grid gap-px">
		<div class="bg-white p-4"> </div>
	</div>
</div>`}
              >
                <div className="flex flex-col gap-px border bg-border">
                  <div className="grid gap-px">
                    <div className="bg-white p-4">
                      <p>
                        Single column, but with grey border to match above.
                      </p>{" "}
                    </div>
                  </div>
                </div>
              </ComponentDemoCard>
            </div>
          </div>
        </Section>

        <Section
          title="Components: Buttons & links"
          description="These examples use buttonVariants from shadcn. Internal navigation uses Link. External navigation uses a normal anchor."
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <h3>Variants in use</h3>

              <ComponentDemoCard
                title="Primary / default"
                code={`<Link
  to="/app/services"
  className={buttonVariants({ variant: "default", size: "default" })}
>
  <IconPlayerPlay size={16} />
  Internal button
</Link>

<a
  href="https://www2.gov.bc.ca"
  className={buttonVariants({ variant: "default", size: "default" })}
>
  External button
  <IconExternalLink size={16} />
</a>`}
              >
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/app/services"
                    className={buttonVariants({
                      variant: "default",
                      size: "default",
                    })}
                  >
                    <IconPlayerPlay size={16} />
                    Internal button
                  </Link>

                  <a
                    href="https://www2.gov.bc.ca"
                    className={buttonVariants({
                      variant: "default",
                      size: "default",
                    })}
                  >
                    External button
                    <IconExternalLink size={16} />
                  </a>
                </div>
              </ComponentDemoCard>

              <ComponentDemoCard
                title="Sizes"
                code={`buttonVariants({ variant: "default", size: "xs" })
buttonVariants({ variant: "default", size: "sm" })
buttonVariants({ variant: "default", size: "default" })
buttonVariants({ variant: "default", size: "lg" })`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={buttonVariants({
                      variant: "default",
                      size: "xs",
                    })}
                  >
                    XS
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "default",
                      size: "sm",
                    })}
                  >
                    Small
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "default",
                      size: "default",
                    })}
                  >
                    Medium
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "default",
                      size: "lg",
                    })}
                  >
                    Large
                  </button>
                </div>
              </ComponentDemoCard>

              <ComponentDemoCard
                title="Outline / ghost / destructive / link"
                code={`buttonVariants({ variant: "outline", size: "default" })
buttonVariants({ variant: "ghost", size: "default" })
buttonVariants({ variant: "destructive", size: "default" })
buttonVariants({ variant: "link", size: "default" })`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={buttonVariants({
                      variant: "outline",
                      size: "default",
                    })}
                  >
                    Outline
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "ghost",
                      size: "default",
                    })}
                  >
                    Tertiary / ghost
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "destructive",
                      size: "default",
                    })}
                  >
                    Danger
                  </button>
                  <button
                    className={buttonVariants({
                      variant: "link",
                      size: "default",
                    })}
                  >
                    Link button
                  </button>
                </div>
              </ComponentDemoCard>

              <ComponentDemoCard
                title="Icons: left, right, icon-only"
                code={`<button className={buttonVariants({ variant: "default", size: "default" })}>
  <IconPlus size={16} />
  Add item
</button>

<button className={buttonVariants({ variant: "outline", size: "default" })}>
  Next step
  <IconArrowRight size={16} />
</button>

<button
  aria-label="Play"
  className={buttonVariants({ variant: "ghost", size: "icon" })}
>
  <IconPlayerPlay size={16} />
</button>
<button
  aria-label="Open external link"
  className={buttonVariants({
    variant: "default",
    size: "icon-sm",
  })}
>
  <IconExternalLink size={16} />
</button>

`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className={buttonVariants({
                      variant: "default",
                      size: "default",
                    })}
                  >
                    <IconPlus size={16} />
                    Add item
                  </button>

                  <button
                    className={buttonVariants({
                      variant: "outline",
                      size: "default",
                    })}
                  >
                    Next step
                    <IconArrowRight size={16} />
                  </button>

                  <button
                    aria-label="Play"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon",
                    })}
                  >
                    <IconPlayerPlay size={16} />
                  </button>

                  <button
                    aria-label="Open external link"
                    className={buttonVariants({
                      variant: "default",
                      size: "icon-sm",
                    })}
                  >
                    <IconExternalLink size={16} />
                  </button>
                </div>
              </ComponentDemoCard>
            </div>
          </div>
        </Section>

        <Section
          title="Components: Accordion & Accordion Group"
          description="The are using customized shadcn components. Styling and behaviour should match BCDS. NavLinkItem and ExternalLink are custom components created for the sidebar accordions."
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <ComponentDemoCard
                title="Accordion Group"
                code={`<AccordionGroup
  title="Resources & Support"
  values={["recommended-reading", "application-support"]}
>
  <AccordionItem value="recommended-reading">
    <AccordionTrigger>Recommended reading</AccordionTrigger>
    <AccordionContent className="p-0">
      <div className="px-4 py-3">
        <ul className="space-y-2">
          <li>
            <ExternalLink href="https://gov.bc.ca">
              Apply for assistance
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://gov.bc.ca">
              On assistance
            </ExternalLink>
          </li>
        </ul>
      </div>
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="application-support">
    <AccordionTrigger>Application support</AccordionTrigger>
    <AccordionContent className="p-0">
      <ul className="divide-y divide-neutral-300">
        <li>
          <NavLinkItem
            to="#"
            icon={
              <IconCake
                size={20}
                stroke={1.5}
                className="text-bcgov-blue"
              />
            }
            title="Service B.C."
            description="Run by the Ministry of Citizens' Services"
          />
        </li>
        <li>
          <NavLinkItem
            to="#"
            icon={
              <IconCake
                size={20}
                stroke={1.5}
                className="text-bcgov-blue"
              />
            }
            title="Public Guardian and Trustee of BC"
            description="We work for British Columbians to protect the legal and
  financial interests of children under the age of 19 years,
  protect the legal, financial, personal and health care
  interests of adults who need help with decision making, and
  administer estates of deceased and missing persons."
          />
        </li>
      </ul>
    </AccordionContent>
  </AccordionItem>
</AccordionGroup>`}
              >
                <AccordionGroup
                  title="Resources & Support"
                  values={["recommended-reading", "application-support"]}
                >
                  <AccordionItem value="recommended-reading">
                    <AccordionTrigger>Recommended reading</AccordionTrigger>
                    <AccordionContent className="p-0">
                      <div className="px-4 py-3">
                        <ul className="space-y-2">
                          <li>
                            <ExternalLink href="https://gov.bc.ca">
                              Apply for assistance
                            </ExternalLink>
                          </li>
                          <li>
                            <ExternalLink href="https://gov.bc.ca">
                              On assistance
                            </ExternalLink>
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="application-support">
                    <AccordionTrigger>Application support</AccordionTrigger>
                    <AccordionContent className="p-0">
                      <ul className="divide-y divide-neutral-300">
                        <li>
                          <NavLinkItem
                            to="#"
                            icon={
                              <IconCake
                                size={20}
                                stroke={1.5}
                                className="text-bcgov-blue"
                              />
                            }
                            title="Service B.C."
                            description="Run by the Ministry of Citizens' Services"
                          />
                        </li>
                        <li>
                          <NavLinkItem
                            to="#"
                            icon={
                              <IconCake
                                size={20}
                                stroke={1.5}
                                className="text-bcgov-blue"
                              />
                            }
                            title="Public Guardian and Trustee of BC"
                            description="We work for British Columbians to protect the legal and
                  financial interests of children under the age of 19 years,
                  protect the legal, financial, personal and health care
                  interests of adults who need help with decision making, and
                  administer estates of deceased and missing persons."
                          />
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </AccordionGroup>
              </ComponentDemoCard>
            </div>
          </div>
        </Section>

        <Section
          title="Coming next"
          description="Reserved space for the next component patterns."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <TodoCard title="Cards" />
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2>{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        {children}
      </div>
    </section>
  );
}

function ColorPaletteRow({
  name,
  swatches,
}: {
  name: string;
  swatches: ColorSwatchItem[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="capitalize">{name}</h3>
        <code className="text-sm text-bcgov-blue">
          bg-{name}-* / text-{name}-* / border-{name}-*
        </code>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {swatches.map((swatch) => (
          <ColorSwatch
            key={`${name}-${swatch.step}`}
            swatch={swatch}
            name={name}
          />
        ))}
      </div>
    </div>
  );
}

function ColorSwatch({
  swatch,
  name,
}: {
  swatch: ColorSwatchItem;
  name: string;
}) {
  const hex = useCssVarValue(swatch.cssVar);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className={`h-20 w-full ${swatch.bg}`} />

      <div className="space-y-1 p-4">
        <div className="font-semibold">
          {name}-{swatch.step}
        </div>
        <code className="block text-xs text-muted-foreground">
          {hex || "—"}
        </code>
        <code className="block text-xs text-muted-foreground">{swatch.bg}</code>
        <code className="block text-xs text-muted-foreground">
          {swatch.text}
        </code>
        <code className="block text-xs text-muted-foreground">
          {swatch.border}
        </code>
      </div>
    </div>
  );
}

function StatusTokenCard({ group }: { group: StatusTokenGroup }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="capitalize">{group.name}</h4>
        <code className="text-xs text-bcgov-blue">{group.textClass}</code>
      </div>

      <div
        className={`rounded-md border-2 px-4 py-3 ${group.surfaceClass} ${group.borderClass} ${group.textClass}`}
      >
        {group.name.charAt(0).toUpperCase() + group.name.slice(1)} surface
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-3">
        <TokenPill label="surface" token={group.surfaceClass} />
        <TokenPill label="border" token={group.borderClass} />
        <TokenPill label="text" token={group.textClass} />
      </div>
    </div>
  );
}

function HeadingComparisonRow({
  label,
  elementPreview,
  classLabel,
  classPreview,
}: {
  label: string;
  elementPreview: React.ReactNode;
  classLabel: string;
  classPreview: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0 lg:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
      <code className="text-sm font-semibold text-bcgov-blue">{label}</code>

      <div className="space-y-2 rounded-md border border-border bg-background p-4">
        <div className="text-xs text-muted-foreground">
          Rendered heading element
        </div>
        {elementPreview}
      </div>

      <div className="space-y-2 rounded-md border border-border bg-background p-4">
        <code className="block text-xs text-muted-foreground">
          {classLabel}
        </code>
        {classPreview}
      </div>
    </div>
  );
}

function TypeRow({
  label,
  preview,
  note,
}: {
  label: string;
  preview: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="grid gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
      <div className="space-y-1">
        <code className="text-sm font-semibold text-bcgov-blue">{label}</code>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <div className="min-w-0">{preview}</div>
    </div>
  );
}

function SpacingDemoCard({
  title,
  code,
  preview,
}: {
  title: string;
  code: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="space-y-1">
        <h4>{title}</h4>
        <code className="block text-xs text-bcgov-blue">{code}</code>
      </div>
      {preview}
    </div>
  );
}

function MiniPreviewRow({
  label,
  code,
  preview,
}: {
  label: string;
  code: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="space-y-1">
        <h4>{label}</h4>
        <code className="block text-xs text-bcgov-blue">{code}</code>
      </div>
      {preview}
    </div>
  );
}

function CodeExampleCard({
  title,
  code,
  preview,
}: {
  title: string;
  code: string;
  preview: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <div className="space-y-1">
        <h3>{title}</h3>
      </div>

      <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 text-sm">
        <code>{code}</code>
      </pre>

      <div>{preview}</div>
    </div>
  );
}

function ComponentDemoCard({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <div className="space-y-1">
        <h4>{title}</h4>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        {children}
      </div>

      <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function BreakpointCard({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-sm text-muted-foreground">Breakpoint</div>
      <div className="text-h5 font-bold">{name}</div>
      <code className="text-sm text-bcgov-blue">{value}</code>
    </div>
  );
}

function MiniHelperCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-4">
      <h4>{title}</h4>
      <div className="space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function TokenPill({ label, token }: { label: string; token: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <code className="text-xs text-bcgov-blue">{token}</code>
    </div>
  );
}

function TodoCard({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-muted-foreground">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm">To come</div>
    </div>
  );
}
function useCssVarValue(variableName: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(variableName).trim();

  return normalizeCssColor(raw);
}

function normalizeCssColor(value: string) {
  if (!value) return "";

  if (value.startsWith("#")) {
    return value.toUpperCase();
  }

  const match = value.match(/rgba?\(([^)]+)\)/i);

  if (!match) {
    return value;
  }

  const parts = match[1]
    .split(",")
    .map((part) => part.trim())
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => Number.isNaN(part))) {
    return value;
  }

  return `#${parts
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
