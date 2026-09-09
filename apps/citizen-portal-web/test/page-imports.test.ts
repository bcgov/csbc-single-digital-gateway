import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// A mechanical backstop for the AI-page-building guardrails (see CLAUDE.md's "Building pages"
// section and .claude/skills/build-page/SKILL.md): catches the two concrete regressions those
// guardrails exist to prevent, without maintaining a fragile import allowlist (page files
// legitimately import a wide, evolving set of local components/hooks/libs — allowlisting every one
// would create constant friction for no real safety benefit). This is intentionally narrow, not a
// general "only sanctioned imports" gate.
const pagesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components');

const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith('-page.tsx'));

// Files allowed to reference the raw `max-w-285` column width directly: the two primitives that
// exist specifically so no other file has to (see PAGE_COLUMN_CLASS in page-content.tsx), plus
// home-page.tsx's Greeting banner, which is a distinct bordered-banner pattern, not the plain page
// body column PageContent covers.
const MAX_W_285_ALLOWED_IN = new Set(['home-page.tsx']);

// Matches Tailwind's arbitrary-value bracket syntax for a hex color, an rgb()/hsl() color
// function, or a raw pixel value — e.g. `bg-[#123456]`, `text-[rgba(0,0,0,.5)]`, `top-[14px]` —
// the specific "hex/px → map to a real token/class in packages/ui/src/styles" convention this repo
// already follows. Deliberately narrower than "any bracket syntax": a structural, non-tokenizable
// arbitrary value with no color/pixel component (e.g. `grid-cols-[auto_1fr]`) isn't what that
// convention targets and would just be noise here. Crude (a plain regex, not a Tailwind-aware AST
// scan) but catches the literal pattern.
const ARBITRARY_VALUE_PATTERN =
  /\b[a-z-]+-\[(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\)|[\d.]+px)\]/;

describe.each(pageFiles)('%s', (file) => {
  const source = readFileSync(resolve(pagesDir, file), 'utf8');

  it('does not reintroduce a raw max-w-285 content wrapper', () => {
    if (MAX_W_285_ALLOWED_IN.has(file)) return;
    expect(source).not.toContain('max-w-285');
  });

  it('does not use Tailwind arbitrary-value syntax', () => {
    const match = ARBITRARY_VALUE_PATTERN.exec(source);
    expect(match?.[0]).toBeUndefined();
  });
});
