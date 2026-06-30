import { Card, CardContent } from '@repo/ui/card';
import { SectionHeading } from '@/components/landing/section-heading';
import { FEATURE_CARDS } from '@/lib/content';

/** The three centred "What you can do" feature cards (icon, title, description). */
export function WhatYouCanDo() {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading
        title="What you can do"
        description="The Single Digital Gateway makes it easier to find and use government services online."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.id}>
              <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-heading text-sm font-semibold text-primary">{card.title}</h3>
                <p className="text-xs/relaxed text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
