/**
 * The AI-page-building component/template catalog. This is a structural clone of the accessibility
 * metadata system (`../a11y/a11y-types.ts`) — same schema → sidecar → generator → committed JSON →
 * drift test shape — but a deliberately separate, independent pipeline. It does not extend
 * `ComponentA11yMetadata` and shares no files with `../a11y/`, so this still-experimental system can
 * be removed later without touching the (permanent) accessibility metadata system.
 */

export type ComponentCategory = 'primitive' | 'composite-input' | 'layout-template';

export type ComponentStatus =
  /** Safe to compose freely on pages. */
  | 'stable'
  /** Don't modify without the repo owner's explicit sign-off — a page-building task should never
   *  alter this file on its own inference. */
  | 'frozen'
  /** New; usage patterns may still change. Treat like `stable` for composing pages, but flag when
   *  proposing to build a whole new page pattern around it. */
  | 'experimental';

export type ComponentUsageMetadata = {
  /** `@repo/ui` subpath name, or an app-local component/layout-template identifier. */
  component: string;
  category: ComponentCategory;
  status: ComponentStatus;
  /** One or two sentences on when to reach for this component. */
  intendedUsage: string;
};
