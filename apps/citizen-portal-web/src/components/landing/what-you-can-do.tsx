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
            <Card key={card.id} className="rounded-(--layout-margin-xs,2px)">
              <CardContent className="flex flex-col justify-between items-center text-center gap-4">
                <span className="flex size-14 items-center justify-center bg-[#F1F8FE] text-primary">
                  <Icon className="size-5 text-[#1a5a96]" aria-hidden />
                </span>
                <h3 className="font-heading text-[18px] font-semibold text-primary">
                  {card.title}
                </h3>
                <p className="text-[14px]/relaxed text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
