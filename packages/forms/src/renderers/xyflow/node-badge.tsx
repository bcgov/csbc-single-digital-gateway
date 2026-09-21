// How a Flow node says what it is (doc 203 rule 8, doc 199 rule 45b): a ring around the card and a pill above
// it, in one of three tones. Shared by the Stage and the Condition so the vocabulary cannot drift between them.
//
// The tones carry MEANING, not decoration, and the meanings are exclusive:
//   success  the flow starts here — BLUE (user 2026-09-21)
//   neutral  the flow ends here — a Stage no edge leaves. GREY (user 2026-09-21); before that black, and
//            before that red. Not red for the same reason it never went back: an end is a perfectly good
//            state, and a finished flow's last Stage would otherwise wear a warning forever.
//   danger   RESERVED for something actually wrong — a Condition that can never route an answer anywhere.
//
// Start and end are BCDS palette steps (`blue-60`, `gray-60`) rather than the `success`/`neutral` state
// families they began as. The tone NAMES are kept: they are what the three treatments mean, and renaming
// them would churn every call site to say the same thing in different words.
export type NodeTone = 'success' | 'neutral' | 'danger';

/** The ring around the card. All three sit OUTSIDE the card's own border, so none of them fight it. */
const RINGS: Readonly<Record<NodeTone, string>> = {
  success: 'ring-4 ring-blue-60 shadow-[0_0_0_6px_var(--color-blue-20)]',
  // The glow was `--color-muted`, which resolves to WHITE in this theme — so the end ring has never
  // actually had one, despite asking for it. `gray-20` is the pale tint the pattern intends.
  neutral: 'ring-4 ring-gray-60 shadow-[0_0_0_6px_var(--color-gray-20)]',
  danger: 'ring-4 ring-danger-border shadow-[0_0_0_6px_var(--color-danger-surface)]',
};

/**
 * The pill's fill. Solid, white text on the tone's own colour — `*-border` is each family's only mid-tone, so it
 * is the BACKGROUND here despite its name; `*-surface` is a pale tint white would disappear into.
 */
const FILLS: Readonly<Record<NodeTone, string>> = {
  success: 'bg-blue-60',
  neutral: 'bg-gray-60',
  danger: 'bg-danger-border',
};

export const ringClass = (tone: NodeTone): string => RINGS[tone];

/**
 * Doc 203 rule 8d (user 2026-09-21): a ringed node drops the studio frame's own outline — "the start, end
 * nodes already have ring/outline, remove the dashed/solid border". Two borders around one card read as two
 * states, and the ring is the one carrying meaning.
 *
 * SELECTION still has to be visible, so the frame's border is not removed — it is made transparent, and
 * turned `gray-80` while selected. Keeping the border BOX means the card never shifts by a pixel as it is
 * selected.
 *
 * The important modifier is the same tool the handles need (`stage-node.tsx`): these override a frame the
 * dispatch renders, whose own `data-[selected]:border-ring` would otherwise win on equal specificity.
 */
export const frameOverrideClass = (): string =>
  '[&_[data-slot=studio-element]]:border-transparent! [&_[data-slot=studio-element][data-selected]]:border-gray-80!';

/**
 * Doc 203 rule 8b: the ring for a Stage that is BOTH start and end — a one-Stage flow.
 *
 * Not expressible through `ringClass`: a `ring` is one colour and a `box-shadow` cannot hold a gradient. It
 * is drawn instead as a gradient BACKGROUND on a padded wrapper, which the card then sits inside — the
 * padding is the ring's width, and the card's own background covers everything but that border.
 *
 * `135deg` runs the boundary RIGHT-TO-LEFT FROM THE TOP (user 2026-09-21) — a `/` split — putting BLUE in
 * the top-left and GREY in the bottom-right.
 *
 * The band is drawn by `p-1` on this wrapper plus an OPAQUE inner wrapper (`stage-node.tsx`). Without that
 * inner background the gradient showed through the studio frame's own transparent padding as well, which
 * made the "ring" about 30px thick instead of the 4px it matches `ring-4` at.
 *
 * NO GLOW. Every single tone pairs its ring with a `*-surface` glow, and a box-shadow cannot be a gradient;
 * borrowing one family's would say the node is more that thing than the other. The split is already the most
 * distinctive treatment on the canvas.
 */
export const splitRingClass = (): string =>
  'p-1 bg-[linear-gradient(135deg,var(--color-blue-60)_0_50%,var(--color-gray-60)_50%_100%)]';

/** Which end of the strip above the card a caption sits at (doc 203 rule 8b). */
export type BadgeSide = 'left' | 'right';

const SIDES: Readonly<Record<BadgeSide, string>> = {
  left: 'left-0',
  right: 'right-0',
};

/**
 * A caption above a ringed node: a ring is a colour, and a colour alone names nothing.
 *
 * ABOVE the card whichever way the canvas runs, not on a face — it is a caption on the node, not an affordance
 * continuing the flow, and beside the card on the horizontal canvas it would sit where an edge arrives.
 *
 * Doc 203 rule 8b: Start sits LEFT and End sits RIGHT, so a Stage that is both wears one at each end of the
 * strip. (An earlier comment here claimed the left alignment kept clear of a "right-aligned Not reachable
 * badge" — no such badge ever existed once rule 9 folded that state into this component, and nothing else
 * has ever been right-aligned above a node.)
 *
 * Presentational only — never a Handle, `pointer-events-none`, and `nodrag nopan` like every other canvas
 * affordance (doc 198 rule 20). Drawn with or without an editor: where a flow begins, ends or breaks is
 * structure, not authoring.
 */
export function NodeBadge({
  label,
  tone,
  side = 'left',
}: {
  readonly label: string;
  readonly tone: NodeTone;
  readonly side?: BadgeSide;
}) {
  return (
    <span
      data-slot="flow-stage-badge"
      data-tone={tone}
      data-side={side}
      className={`nodrag nopan pointer-events-none absolute bottom-full ${SIDES[side]} mb-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${FILLS[tone]}`}
    >
      {label}
    </span>
  );
}
