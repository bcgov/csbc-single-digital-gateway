// How a Flow node says what it is (doc 203 rule 8, doc 199 rule 45b): a ring around the card and a pill above
// it, in one of three tones. Shared by the Stage and the Condition so the vocabulary cannot drift between them.
//
// The tones carry MEANING, not decoration, and the meanings are exclusive:
//   success  the flow starts here
//   neutral  the flow ends here — a Stage no edge leaves. Black, not red (user 2026-09-17): an end is a
//            perfectly good state, and a finished flow's last Stage would otherwise wear a warning forever.
//   danger   RESERVED for something actually wrong — a Condition that can never route an answer anywhere.
export type NodeTone = 'success' | 'neutral' | 'danger';

/** The ring around the card. All three sit OUTSIDE the card's own border, so none of them fight it. */
const RINGS: Readonly<Record<NodeTone, string>> = {
  success: 'ring-4 ring-success-border shadow-[0_0_0_6px_var(--color-success-surface)]',
  neutral: 'ring-4 ring-foreground shadow-[0_0_0_6px_var(--color-muted)]',
  danger: 'ring-4 ring-danger-border shadow-[0_0_0_6px_var(--color-danger-surface)]',
};

/**
 * The pill's fill. Solid, white text on the tone's own colour — `*-border` is each family's only mid-tone, so it
 * is the BACKGROUND here despite its name; `*-surface` is a pale tint white would disappear into.
 */
const FILLS: Readonly<Record<NodeTone, string>> = {
  success: 'bg-success-border',
  neutral: 'bg-foreground',
  danger: 'bg-danger-border',
};

export const ringClass = (tone: NodeTone): string => RINGS[tone];

/**
 * A caption above a ringed node: a ring is a colour, and a colour alone names nothing.
 *
 * ABOVE the card whichever way the canvas runs, not on a face — it is a caption on the node, not an affordance
 * continuing the flow, and beside the card on the horizontal canvas it would sit where an edge arrives.
 * LEFT-ALIGNED with the card's edge, which keeps it clear of the right-aligned "Not reachable" badge: a Stage
 * can be an end AND unreachable, so the two share that strip.
 *
 * Presentational only — never a Handle, `pointer-events-none`, and `nodrag nopan` like every other canvas
 * affordance (doc 198 rule 20). Drawn with or without an editor: where a flow begins, ends or breaks is
 * structure, not authoring.
 */
export function NodeBadge({ label, tone }: { readonly label: string; readonly tone: NodeTone }) {
  return (
    <span
      data-slot="flow-stage-badge"
      data-tone={tone}
      className={`nodrag nopan pointer-events-none absolute bottom-full left-0 mb-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${FILLS[tone]}`}
    >
      {label}
    </span>
  );
}
