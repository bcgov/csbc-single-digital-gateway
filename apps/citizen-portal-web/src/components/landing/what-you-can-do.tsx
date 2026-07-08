import { Icon } from '@mdi/react';
import { Card, CardDescription, CardHeader, CardIconAction, CardTitle } from '@repo/ui/card';
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
      <div className="grid gap-6 md:grid-cols-3">
        {FEATURE_CARDS.map((card) => (
          <Card key={card.id} centered>
            <CardIconAction size="lg">
              <Icon path={card.icon} size="32px" className="text-blue-80" aria-hidden={true} />
            </CardIconAction>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
