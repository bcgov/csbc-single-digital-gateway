import { rankWith, uiTypeIs, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/card';
import type { Ref } from 'react';
import { CardFrame, SlotDispatch } from '../default/card-layout';
import { cardDescription, cardSlots, cardTitle } from '../ui/card-model';
import { CardSlotContext } from './card-slot';
import { InlineEditableText } from './inline-text';
import { mayEdit, useStudioEditor } from './studio-editor';
import { releaseTabStrip, STUDIO_CARD_SLOT } from './tab-strip-hold';
import { useStudioElement } from './studio-element';

/** Outranks the default Card (doc 273 rule 5). */
export const studioCardTester = rankWith(2, uiTypeIs('Card'));

/**
 * A Card authored on the canvas (doc 273 rules 5-7): the header always drawn, its title and description edited in
 * place, then the content slot and the footer slot (when the Card has one), each an ordinary studio VerticalLayout.
 */
export function StudioCard({ uischema, visible, ...props }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  if (!visible) return null;
  const id = element?.id;
  const editable = (key: string) => editor !== null && id !== undefined && mayEdit(editor, id, key);
  const { content, footer } = cardSlots(uischema);
  // A p-2 inset, not ELEMENT_INSET's p-4: the Card's own ring and padding already sit it clear of its frame (requested).
  return (
    <div
      data-slot={STUDIO_CARD_SLOT}
      // Doc 273 B1: a drag held inside the Card leaves its slot's grid once it leaves the Card.
      onMouseLeave={(event) => releaseTabStrip(event.nativeEvent)}
      className="p-2"
    >
      <CardFrame element={uischema}>
        <CardHeader>
          <InlineEditableText
            text={cardTitle(uischema) ?? ''}
            placeholder="Card title"
            slot="card-title"
            editLabel="Card title"
            editable={editable('cardTitle')}
            onCommit={(next) => {
              if (editor !== null && id !== undefined)
                editor.update(id, { label: next === '' ? undefined : next });
            }}
            render={({ ref, ...rest }) => <CardTitle ref={ref as Ref<HTMLDivElement>} {...rest} />}
          />
          <InlineEditableText
            text={cardDescription(uischema) ?? ''}
            placeholder="Description"
            slot="card-description"
            className="whitespace-pre-line"
            editLabel="Card description"
            multiline
            editable={editable('cardDescription')}
            onCommit={(next) => {
              if (editor !== null && id !== undefined)
                editor.update(id, { options: { description: next === '' ? undefined : next } });
            }}
            render={({ ref, ...rest }) => (
              <CardDescription ref={ref as Ref<HTMLDivElement>} {...rest} />
            )}
          />
        </CardHeader>
        {content !== undefined && (
          <CardContent>
            <CardSlotContext.Provider value="content">
              <SlotDispatch layout={content} props={props} />
            </CardSlotContext.Provider>
          </CardContent>
        )}
        {footer !== undefined && (
          <CardFooter>
            <CardSlotContext.Provider value="footer">
              <SlotDispatch layout={footer} props={props} />
            </CardSlotContext.Provider>
          </CardFooter>
        )}
      </CardFrame>
    </div>
  );
}

export const studioCardEntry = {
  tester: studioCardTester,
  renderer: withJsonFormsLayoutProps(StudioCard),
};
