import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Input } from '@ui/components/ui/input';
import { Textarea } from '@ui/components/ui/textarea';

/**
 * The absolute path to `src`, injected by vitest.config.ts. Neither of the obvious alternatives
 * works here: `import.meta.url` is left unresolved by the test transform, and Vite's CSS pipeline
 * returns an EMPTY string for a `?raw` stylesheet import.
 */
declare const __UI_SRC__: string;

const read = (relative: string): string => readFileSync(join(__UI_SRC__, relative), 'utf8');

const tokensCss = () => read('styles/tokens.css');
const themeCss = () => read('styles/theme.css');

/** Every component whose surface is a text-entry FILL (doc 173, rule 4). */
const TEXT_ENTRY = [
  'components/ui/input.tsx',
  'components/ui/textarea.tsx',
  'components/ui/input-group.tsx',
  'components/ui/native-select.tsx',
  'components/ui/select.tsx',
  'components/ui/combobox.tsx',
  'components/ui/command.tsx',
  'inputs/rich-text-input.tsx',
];

/** `command.tsx` delegates its border to the InputGroup it renders, so it has none of its own. */
const TEXT_ENTRY_WITH_BORDER = TEXT_ENTRY.filter((f) => !f.endsWith('command.tsx'));

/** The read-only affordance (feature 170) lives on the components that can be read-only. */
const READ_ONLY_CAPABLE = ['components/ui/input.tsx', 'components/ui/input-group.tsx'];

/** `bg-input` here is a SOLID ELEMENT colour, not a fill — recolouring it would erase the element. */
const SOLID_ELEMENT = [
  'components/ui/switch.tsx',
  'components/ui/checkbox.tsx',
  'components/ui/radio-group.tsx',
  'components/ui/button-group.tsx',
  'inputs/select-input.tsx',
];

/**
 * MDD doc 173 — the input surface token split. `--app-input` is the input BORDER; the new
 * `--app-input-background` is the input FILL. The two must be independently settable (rule 8).
 *
 * Most assertions here read the source/CSS directly rather than rendering: this is a styling
 * contract across eight components plus two token files, and jsdom has no cascade to observe.
 */
describe('input surface token (feature 173)', () => {
  describe('token wiring', () => {
    it('defines --app-input-background separately from --app-input', () => {
      expect(tokensCss()).toMatch(/--app-input-background:/);
      const border = /--app-input:\s*([^;]+);/.exec(tokensCss())?.[1]?.trim();
      const fill = /--app-input-background:\s*([^;]+);/.exec(tokensCss())?.[1]?.trim();
      expect(border).toBeDefined();
      expect(fill).toBeDefined();
      // Rule 8: two tokens, two values — otherwise they cannot be set independently.
      expect(fill).not.toBe(border);
    });

    it('leaves --app-input pointing at the BC border-default token', () => {
      expect(tokensCss()).toContain('--app-input: var(--bcds-surface-color-border-default);');
    });

    it('points --app-input-background at the BC white background token', () => {
      expect(tokensCss()).toContain(
        '--app-input-background: var(--bcds-surface-color-background-white);',
      );
    });

    it('exposes --color-input-background in the @theme block so Tailwind generates the utility', () => {
      expect(themeCss()).toContain('--color-input-background: var(--app-input-background);');
      // The border token stays exposed too — this feature adds a token, it does not repurpose one.
      expect(themeCss()).toContain('--color-input: var(--app-input);');
    });
  });

  describe('text-entry surfaces use the fill token', () => {
    it('renders Input with the fill token and the border token', () => {
      render(<Input aria-label="Name" />);
      const className = screen.getByLabelText('Name').className;
      expect(className).toContain('bg-input-background');
      expect(className).toContain('border-input');
      expect(className).not.toContain('bg-input/20');
    });

    it('renders Textarea with the fill token and the border token', () => {
      render(<Textarea aria-label="Notes" />);
      const className = screen.getByLabelText('Notes').className;
      expect(className).toContain('bg-input-background');
      expect(className).toContain('border-input');
      expect(className).not.toContain('bg-input/20');
    });

    it('switches every text-entry component off bg-input/20', () => {
      for (const file of TEXT_ENTRY) {
        const source = read(file);
        expect(source, `${file} should use the fill token`).toContain('bg-input-background');
        expect(source, `${file} should not dilute the border token`).not.toContain('bg-input/20');
      }
    });

    it('never applies an alpha modifier to the fill token', () => {
      // bg-input-background/20 would render the white token 20% opaque — the original bug (rule 3).
      for (const file of TEXT_ENTRY) {
        expect(read(file), `${file} must use the fill token at full strength`).not.toMatch(
          /bg-input-background\//,
        );
      }
    });

    it('keeps border-input on every text-entry component that owns its border', () => {
      for (const file of TEXT_ENTRY_WITH_BORDER) {
        expect(read(file), `${file} should keep its border`).toContain('border-input');
      }
    });

    it('drops the inert dark: fill variant from the touched components', () => {
      // No .dark / prefers-color-scheme / data-theme block exists in this project, and theming
      // belongs to the token layer anyway (rule 7).
      for (const file of TEXT_ENTRY) {
        expect(read(file), `${file} should carry no dark fill variant`).not.toContain(
          'dark:bg-input/30',
        );
      }
    });
  });

  describe('read-only affordance (feature 170)', () => {
    it('keeps read-only:bg-input/50 on the components that had it', () => {
      // The address country/province locks depend on a read-only input being visibly distinct.
      // input.tsx uses `read-only:`; input-group.tsx expresses the same thing through
      // `has-[[data-slot=input-group-control]:read-only]:`.
      for (const file of READ_ONLY_CAPABLE) {
        expect(read(file), `${file} must keep the read-only tint`).toMatch(
          /read-only\]?:bg-input\/50/,
        );
      }
    });

    it('renders a read-only Input with a fill distinct from the editable fill', () => {
      render(<Input aria-label="Locked" readOnly />);
      const className = screen.getByLabelText('Locked').className;
      // Editable fill and locked tint are different tokens, so the lock stays legible.
      expect(className).toContain('bg-input-background');
      expect(className).toContain('read-only:bg-input/50');
    });
  });

  describe('solid-element components are untouched', () => {
    it('leaves the switch track, checkbox and radio box on bg-input', () => {
      // These are not fills — recolouring them white erases the element (rule 5).
      for (const file of [
        'components/ui/switch.tsx',
        'components/ui/checkbox.tsx',
        'components/ui/radio-group.tsx',
      ]) {
        const source = read(file);
        expect(source, `${file} should still use bg-input`).toMatch(/bg-input\b(?!-background)/);
        expect(source, `${file} should not use the fill token`).not.toContain(
          'bg-input-background',
        );
      }
    });

    it('leaves the button-group and select-input separators on bg-input', () => {
      for (const file of SOLID_ELEMENT.slice(3)) {
        const source = read(file);
        expect(source, `${file} should still use bg-input`).toMatch(/bg-input\b(?!-background)/);
        expect(source, `${file} should not use the fill token`).not.toContain(
          'bg-input-background',
        );
      }
    });
  });
});
