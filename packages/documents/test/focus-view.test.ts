import { describe, expect, it } from 'vitest';
import { ease, MOTION } from '../src/studio/canvas-zoom';
import { NODE_WIDTH, type AddEdge, type CanvasNode } from '../src/studio/canvas-graph';
import {
  CARD_HEIGHT,
  flowRect,
  focusEdges,
  focusRect,
  scrollExtent,
  focusNodes,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  pageRect,
} from '../src/studio/focus-view';

const marks = { first: false, start: false, end: false, invalid: false, floating: false };
const formAt = (id: string, x: number, y: number): CanvasNode => ({
  id,
  type: 'form',
  position: { x, y },
  data: { formId: id, label: id, ...marks },
});
const nodes = [formAt('A', 0, 0), formAt('B', 0, 160)];
const edges: AddEdge[] = [
  {
    id: 'e1',
    type: 'add',
    source: 'A',
    target: 'B',
    data: { add: { kind: 'between', edgeId: 'e1' }, sourceName: 'A' },
  },
];
// The focused Form's page (doc 236 rule 34): the node carries the SAME object the frame does.
const formPage = { form: { id: 'A', type: 'Form', elements: [] }, schema: {} };
const frame = (
  id: string | null,
  settled = false,
  leaving: string | null = null,
  keepsTrailing = false,
) => ({ id, settled, leaving, page: formPage, keepsTrailing });

describe('focusNodes', () => {
  it("grows the focused Form into its page in place, centred on its card's centre", () => {
    const [a] = focusNodes(nodes, frame('A'));

    expect(a!.id).toBe('A');
    expect(a!.position).toEqual({
      x: NODE_WIDTH / 2 - PAGE_WIDTH / 2,
      y: CARD_HEIGHT / 2 - PAGE_HEIGHT / 2,
    });
    expect(a!.data).toMatchObject({ focused: true });
    expect(a!.data['page']).toBe(formPage);
    expect(a!.className).toMatch(/transition-\[transform,opacity\]/);
  });

  it('opens the page — as tall as its content — only once the growth has settled', () => {
    expect(focusNodes(nodes, frame('A'))[0]!.data['open']).toBe(false);
    expect(focusNodes(nodes, frame('A', true))[0]!.data['open']).toBe(true);
  });

  it('fades every other node out, then hides it once settled', () => {
    expect(focusNodes(nodes, frame('A'))[1]).toMatchObject({
      className: expect.stringMatching(/opacity-0/),
    });
    expect(focusNodes(nodes, frame('A'))[1]!.hidden).toBeUndefined();
    expect(focusNodes(nodes, frame('A', true))[1]!.hidden).toBe(true);
  });

  it('shows everything with nothing focused, with no fade to replay', () => {
    const shown = focusNodes(nodes, frame(null));

    expect(shown.every((n) => n.hidden !== true && !/fade/.test(n.className ?? ''))).toBe(true);
    expect(shown[0]!.data['focused']).toBeUndefined();
  });

  it('on Back, shrinks the leaving Form with its page closing over the card while the rest fades in', () => {
    const [a, b] = focusNodes(nodes, frame(null, false, 'A'));

    expect(a!.position).toEqual({ x: 0, y: 0 });
    expect(a!.data).toMatchObject({ closing: true });
    expect(a!.data['page']).toBe(formPage);
    expect(a!.data['focused']).toBeUndefined();
    expect(a!.className).not.toMatch(/fade/);
    expect(b!.className).toMatch(/document-studio-fade-in/);
  });

  it('never puts a transform animation on a node — xyflow positions nodes by transform', () => {
    const frames = [frame('A'), frame('A', true), frame(null), frame(null, false, 'A')];
    for (const f of frames) {
      for (const node of focusNodes(nodes, f))
        expect(node.className ?? '').not.toMatch(/animate-in/);
    }
  });
});

describe('focusEdges', () => {
  /** A → B, and B → C: focusing A, e1 is attached to the growing page and e2 is not. */
  const flow: AddEdge[] = [
    ...edges,
    {
      id: 'e2',
      type: 'add',
      source: 'B',
      target: 'C',
      data: { add: { kind: 'between', edgeId: 'e2' }, sourceName: 'B' },
    },
  ];

  it('drops edges attached to the growing page at once — they would stretch across the canvas', () => {
    const [attached] = focusEdges(flow, frame('A'));

    expect(attached!.hidden).toBe(true);
  });

  it('fades every other edge out with its label and +, then hides it once settled', () => {
    expect(focusEdges(flow, frame('A'))[1]).toMatchObject({
      className: expect.stringMatching(/opacity-0/),
      data: { fading: true },
    });
    expect(focusEdges(flow, frame('A', true)).every((e) => e.hidden === true)).toBe(true);
  });

  it('on Back, fades other edges in with the flow and attached ones only once the page is a card', () => {
    const [attached, other] = focusEdges(flow, frame(null, false, 'A'));

    expect(attached).toMatchObject({
      className: expect.stringMatching(/fade-in_200ms_ease-out_300ms/),
      data: { appearing: 'after-page' },
    });
    expect(attached!.hidden).toBeUndefined();
    expect(other).toMatchObject({
      className: expect.stringMatching(/fade-in_300ms/),
      data: { appearing: 'with-flow' },
    });
  });

  it('leaves edges alone with nothing focused or leaving', () => {
    expect(focusEdges(flow, frame(null))).toBe(flow);
  });
});

describe('pageRect / flowRect', () => {
  it("fills a page centred on the card's centre, so the camera zooms in rather than pans", () => {
    const page = pageRect(formAt('A', 100, 40));

    expect(page).toEqual({
      x: 100 + NODE_WIDTH / 2 - PAGE_WIDTH / 2,
      y: 40 + CARD_HEIGHT / 2 - PAGE_HEIGHT / 2,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    });
    expect(page.x + page.width / 2).toBe(100 + NODE_WIDTH / 2);
    expect(page.y + page.height / 2).toBe(40 + CARD_HEIGHT / 2);
  });

  it('bounds the flow with the unfocused Form back at card size, not its page size', () => {
    const size = { width: NODE_WIDTH, height: 994 };
    const measured: CanvasNode[] = [
      { ...formAt('A', 0, 0), measured: size },
      { ...formAt('B', 0, 160), measured: size },
    ];

    expect(flowRect(measured, 'A')).toEqual({ x: 0, y: 0, width: NODE_WIDTH, height: 160 + 994 });
    expect(flowRect([measured[0]!], 'A').height).toBe(56);
  });
});

describe('the shared motion', () => {
  it("eases the camera with easeInOutCubic, the CSS curve's twin", () => {
    expect([0, 0.25, 0.5, 0.75, 1].map(ease)).toEqual([0, 0.0625, 0.5, 0.9375, 1]);
    expect(MOTION).toContain('ease-[cubic-bezier(0.65,0,0.35,1)]');
  });
});

describe('a root page keeps its trailing +', () => {
  const root = formAt('R', 0, 0);
  const end: CanvasNode = { id: 'end:R:out', type: 'end', position: { x: 120, y: 120 }, data: {} };
  const trailing: AddEdge = {
    id: 'trailing:R:out',
    type: 'add',
    source: 'R',
    target: 'end:R:out',
    data: { add: { kind: 'trailing', output: { source: 'R' } }, sourceName: 'R' },
  };

  it('keeps the + below a page that has grown taller than its first screen', () => {
    const tall = { ...root, measured: { width: 768, height: 2400 } };
    const [, moved] = focusNodes([tall, end], frame('R', true, null, true));

    expect(moved!.position.y).toBe(pageRect(root).y + 2400 + 32);
  });

  it('moves the end node just below the page and keeps it shown once settled', () => {
    const [, moved] = focusNodes([root, end], frame('R', true, null, true));
    const page = pageRect(root);

    expect(moved!.hidden).toBeUndefined();
    expect(moved!.position).toEqual({ x: 120, y: page.y + page.height + 32 });
  });

  it('draws the trailing edge, fading in, once settled — never while the page grows', () => {
    expect(focusEdges([trailing], frame('R', true, null, true))[0]).toMatchObject({
      data: { appearing: 'with-flow' },
    });
    expect(focusEdges([trailing], frame('R', true, null, true))[0]!.hidden).toBeUndefined();
    expect(focusEdges([trailing], frame('R', false, null, true))[0]!.hidden).toBe(true);
  });

  it('hides a non-root page’s trailing + like everything else', () => {
    expect(focusNodes([root, end], frame('R', true))[1]!.hidden).toBe(true);
    expect(focusEdges([trailing], frame('R', true))[0]!.hidden).toBe(true);
  });
});

describe('focusRect', () => {
  it("fits a page — and, for a root page, its trailing + below, the button's whole circle", () => {
    const card = formAt('A', 0, 0);
    const page = pageRect(card);

    expect(focusRect(card, false)).toEqual(page);
    expect(focusRect(card, true)).toEqual({ ...page, height: page.height + 32 + 12 });
  });
});

describe('scrollExtent', () => {
  const card = formAt('A', 0, 0);
  const page = pageRect(card);

  it('scrolls an open page from its top to its grown bottom, with a margin', () => {
    expect(scrollExtent(card, 2400, false)).toEqual([
      [page.x - 64, page.y - 64],
      [page.x + page.width + 64, page.y + 2400 + 64],
    ]);
  });

  it('never scrolls less than the first screen, and reaches a root page’s + below it', () => {
    expect(scrollExtent(card, 300, false)[1][1]).toBe(page.y + page.height + 64);
    expect(scrollExtent(card, undefined, true)[1][1]).toBe(page.y + page.height + 32 + 24 + 64);
  });
});
