import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// A mechanical backstop for the AI-page-building guardrails (see src/catalog/README.md): catches
// the concrete regressions those guardrails exist to prevent, without maintaining a fragile import
// allowlist (page files legitimately import a wide, evolving set of local components/hooks/libs —
// allowlisting every one would create constant friction for no real safety benefit). This is
// intentionally narrow, not a general "only sanctioned imports" gate.
const componentsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components');

// Every app component outside the /dev reference pages (which deliberately show raw markup) and
// the layout primitives themselves (which are where these strings are *supposed* to live).
const files = readdirSync(componentsDir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => resolve(componentsDir, f))
  .filter((path) => {
    const rel = relative(componentsDir, path);
    return !rel.startsWith('dev/') && !rel.startsWith('layout/');
  });

// Matches Tailwind's arbitrary-value bracket syntax for a hex color, an rgb()/hsl() color
// function, or a raw pixel value — e.g. `bg-[#123456]`, `text-[rgba(0,0,0,.5)]`, `top-[14px]` —
// the specific "hex/px → map to a real token/class in packages/ui/src/styles" convention this repo
// already follows. Deliberately narrower than "any bracket syntax": a structural, non-tokenizable
// arbitrary value with no color/pixel component (e.g. `grid-cols-[auto_1fr]`) isn't what that
// convention targets and would just be noise here. Crude (a plain regex, not a Tailwind-aware AST
// scan) but catches the literal pattern.
const ARBITRARY_VALUE_PATTERN =
  /\b[a-z-]+-\[(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?)\([^)]*\)|[\d.]+px)\]/;

describe.each(files.map((path) => ({ name: relative(componentsDir, path), path })))(
  '$name',
  ({ path }) => {
    const source = readFileSync(path, 'utf8');

    it('does not hand-roll the page column (use PageContent, PageHeaderBanner, FullBleedBand or PAGE_COLUMN_CLASS)', () => {
      expect(source).not.toContain('max-w-285');
    });

    it('does not hand-roll a centered message card (use MessageCard or LoginGate)', () => {
      expect(source).not.toContain('ring-1 ring-foreground/10');
    });

    it('does not use Tailwind arbitrary-value syntax for a color or pixel value', () => {
      const match = ARBITRARY_VALUE_PATTERN.exec(source);
      expect(match?.[0]).toBeUndefined();
    });
  },
);
