import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GridItemHTMLElement, GridStack } from 'gridstack';
import { afterEach, describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, type StoredDocument } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

// Bug (doc 256, found by hand): a switch whose rule tests a checkbox, moved above it, did not turn red.
const RULE = {
  effect: 'SHOW',
  condition: { scope: '#/properties/cb', schema: { const: true }, failWhenUndefined: true },
};
const SEED: StoredDocument[] = [
  {
    id: 'doc',
    kind: 'document',
    type: 'services.service-application-method',
    versions: [
      {
        id: 'v1',
        versionNumber: 1,
        content: {
          schema: {
            type: 'object',
            properties: {
              cb: { type: 'boolean', title: 'Untitled checkbox' },
              sw: { type: 'boolean', title: 'Untitled switch' },
            },
          },
          variants: {
            default: {
              id: 'F',
              type: 'Form',
              label: 'Page',
              elements: [
                { id: 'cCb', type: 'Control', scope: '#/properties/cb' },
                {
                  id: 'cSw',
                  type: 'Control',
                  scope: '#/properties/sw',
                  options: { component: 'switch' },
                  rule: RULE,
                },
              ],
            },
          },
        },
      },
    ],
  },
];

const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
afterEach(() => Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight));

/** The document as the inspector's Schema view prints it. */
async function schemaJson(): Promise<string> {
  const panel = document.querySelector<HTMLElement>('[data-slot="document-studio-inspector"]')!;
  fireEvent.click(panel.querySelector<HTMLElement>('button[aria-label="JSON"]')!);
  const text = panel.querySelector('pre')?.textContent ?? '';
  fireEvent.click(panel.querySelector<HTMLElement>('button[aria-label="Settings"]')!);
  return text;
}

describe('rule error after a move (doc 256 rule 5, bug)', () => {
  it('warns on an element moved above the field its rule tests, keeps the rule, and clears when moved back', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 36,
    });
    render(<DocumentStudio documentId="doc" store={createDocumentStore({ seed: SEED })} />);
    const page = await screen.findByRole('article', { name: 'Page page' });
    const sw = () =>
      page.querySelector<HTMLElement>('[data-slot="studio-element"][data-element-id="cSw"]')!;
    const grid = () =>
      page.querySelector('[data-slot="studio-vertical-layout"]') as HTMLElement & {
        gridstack: GridStack;
      };
    // Only an OPEN page edits: wait until a click selects.
    await waitFor(() => {
      fireEvent.click(sw());
      expect(sw()).toHaveAttribute('data-selected');
    });
    expect(sw()).not.toHaveAttribute('data-rule-error');

    await act(async () => {
      grid().gridstack.update(grid().querySelector<GridItemHTMLElement>('[gs-id="cSw"]')!, {
        y: 0,
      });
    });
    await waitFor(() => expect(sw()).toHaveAttribute('data-rule-error', ''));
    // The move kept the rule: the reorder wrote it back as `rule`, never the canvas-only key.
    expect(document.querySelector('[data-slot="inspector-rule-summary"]')).toHaveTextContent(
      'Show when Untitled checkbox is true',
    );
    const json = await schemaJson();
    expect(json).toContain('"rule"');
    expect(json).not.toContain('x-studio-rule');

    await act(async () => {
      grid().gridstack.update(grid().querySelector<GridItemHTMLElement>('[gs-id="cSw"]')!, {
        // Well below the checkbox: after the remount items are measured several rows tall.
        y: 30,
      });
    });
    await waitFor(() => expect(sw()).not.toHaveAttribute('data-rule-error'));
    expect(document.querySelector('[data-slot="inspector-rule-summary"]')).toHaveTextContent(
      'Show when Untitled checkbox is true',
    );
  });
});
