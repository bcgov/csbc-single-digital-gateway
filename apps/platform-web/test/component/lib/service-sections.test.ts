import { describe, expect, it } from 'vitest';
import {
  alwaysSectionAnchors,
  deriveRuns,
  deriveSectionAnchors,
  deriveSections,
  serviceSectionAnchors,
  slugify,
  type LooseRun,
  type SectionRun,
  type UiElement,
} from '@/lib/service-sections';

const group = (label: unknown, elements: UiElement[] = []): UiElement => ({
  type: 'Group',
  label,
  elements,
});

const control = (scope: string): UiElement => ({ type: 'Control', scope });

/**
 * Feature 174. `deriveRuns(uischema)` splits a service uischema's TOP-LEVEL elements into ordered
 * runs: each `{ type: 'Group' }` becomes an anchored section, and every run of consecutive
 * non-Group elements becomes a "loose" run rendered in place. The page and the sidebar both consume
 * this, so anchors are part of the contract.
 */
describe('deriveSections', () => {
  describe('section derivation', () => {
    it('should emit one section per top-level Group, in document order', () => {
      const sections = deriveSections({
        type: 'VerticalLayout',
        elements: [
          group('Service description'),
          group('Eligibility criteria'),
          group('Configuration'),
        ],
      });

      expect(sections).toHaveLength(3);
      expect(sections.map((section) => section.label)).toEqual([
        'Service description',
        'Eligibility criteria',
        'Configuration',
      ]);
      expect(sections.map((section) => section.anchor)).toEqual([
        'service-description',
        'eligibility-criteria',
        'configuration',
      ]);
    });

    it('should carry the Group element through on each section so the caller can dispatch it', () => {
      const about = control('#/properties/service_description/properties/about');
      const element = group('Service description', [about]);

      const [section] = deriveSections({ type: 'VerticalLayout', elements: [element] });

      // Identity matters — the page dispatches this exact element through JsonForms.
      expect(section?.element).toBe(element);
      expect(section?.element.elements).toEqual([about]);
    });

    it('should ignore Groups nested inside another element (top level only)', () => {
      const sections = deriveSections({
        type: 'VerticalLayout',
        elements: [
          {
            type: 'HorizontalLayout',
            elements: [group('Nested and should not become a section')],
          },
        ],
      });

      expect(sections).toEqual([]);
    });

    it('should return an empty list for a uischema with no elements', () => {
      expect(deriveSections({ type: 'VerticalLayout', elements: [] })).toEqual([]);
    });

    it('should return an empty list for a malformed uischema (no elements array)', () => {
      expect(deriveSections({})).toEqual([]);
      expect(deriveSections({ elements: 'not-an-array' })).toEqual([]);
      expect(deriveSections(null)).toEqual([]);
      expect(deriveSections(undefined)).toEqual([]);
    });
  });

  describe('loose runs', () => {
    it('should group consecutive non-Group elements into a single loose run', () => {
      const title = control('#/properties/title');
      const description = control('#/properties/description');

      const runs = deriveRuns({ type: 'VerticalLayout', elements: [title, description] });

      expect(runs).toHaveLength(1);
      expect(runs[0]?.kind).toBe('loose');
      expect((runs[0] as LooseRun).elements).toEqual([title, description]);
    });

    it('should preserve document order across interleaved loose runs and sections', () => {
      const title = control('#/properties/title');
      const trailing = control('#/properties/notes');

      const runs = deriveRuns({
        type: 'VerticalLayout',
        elements: [title, group('Service description'), trailing, group('Configuration')],
      });

      expect(runs.map((run) => run.kind)).toEqual(['loose', 'section', 'loose', 'section']);
      expect((runs[0] as LooseRun).elements).toEqual([title]);
      expect((runs[1] as SectionRun).anchor).toBe('service-description');
      expect((runs[2] as LooseRun).elements).toEqual([trailing]);
      expect((runs[3] as SectionRun).anchor).toBe('configuration');
    });
  });

  describe('anchors', () => {
    it('should slugify the Group label (lowercase, non-alphanumerics collapsed to a dash)', () => {
      expect(slugify('Service description')).toBe('service-description');
      expect(slugify('  Eligibility   Criteria  ')).toBe('eligibility-criteria');
      expect(slugify('Step 1: Apply')).toBe('step-1-apply');
    });

    it('should slugify "Data & privacy" to "data-privacy"', () => {
      // Backwards-compatible with the section keys the sidebar hardcoded before this feature.
      expect(slugify('Data & privacy')).toBe('data-privacy');
      const [section] = deriveSections({ elements: [group('Data & privacy')] });
      expect(section?.anchor).toBe('data-privacy');
    });

    it('should suffix -2, -3 on duplicate labels so every anchor is unique', () => {
      const sections = deriveSections({
        elements: [group('Details'), group('Details'), group('Details')],
      });

      expect(sections.map((section) => section.anchor)).toEqual([
        'details',
        'details-2',
        'details-3',
      ]);
    });

    it('should fall back to section-<index> for a Group with a missing or blank label', () => {
      const sections = deriveSections({
        elements: [group(undefined), group('   '), group('Real'), group(42)],
      });

      expect(sections.map((section) => section.anchor)).toEqual([
        'section-1',
        'section-2',
        'real',
        'section-4',
      ]);
      expect(sections.map((section) => section.label)).toEqual(['', '', 'Real', '']);
    });
  });

  describe('serviceSectionAnchors / alwaysSectionAnchors', () => {
    const always = [{ anchor: 'configuration', label: 'Configuration' }];

    it('should append the always-on sections after the derived ones', () => {
      expect(serviceSectionAnchors({ elements: [group('Service description')] }, always)).toEqual([
        { anchor: 'service-description', label: 'Service description' },
        { anchor: 'configuration', label: 'Configuration' },
      ]);
    });

    it('should return the always-on sections even when nothing derives', () => {
      expect(serviceSectionAnchors({ elements: [] }, always)).toEqual(always);
      expect(serviceSectionAnchors(undefined, always)).toEqual(always);
    });

    it('should suffix an always-on anchor that clashes with a derived Group', () => {
      // A definition that authors its own "Configuration" Group keeps the plain anchor; the
      // always-on section steps aside so no `#hash` resolves to two elements.
      expect(serviceSectionAnchors({ elements: [group('Configuration')] }, always)).toEqual([
        { anchor: 'configuration', label: 'Configuration' },
        { anchor: 'configuration-2', label: 'Configuration' },
      ]);
    });

    it('should default to no always-on sections', () => {
      expect(serviceSectionAnchors({ elements: [group('Only')] })).toEqual([
        { anchor: 'only', label: 'Only' },
      ]);
    });

    it('alwaysSectionAnchors should return ONLY the tail, never the derived sections', () => {
      // Guards the bug a `.slice(-always.length)` would hide: with an empty always-list, a
      // negative-zero slice returns the whole array.
      expect(alwaysSectionAnchors({ elements: [group('Service description')] }, always)).toEqual(
        always,
      );
      expect(alwaysSectionAnchors({ elements: [group('Service description')] }, [])).toEqual([]);
    });
  });

  describe('deriveSectionAnchors', () => {
    it('should return just the anchor/label pairs the sidebar renders', () => {
      expect(
        deriveSectionAnchors({
          elements: [
            control('#/properties/title'),
            group('Service description'),
            group('Configuration'),
          ],
        }),
      ).toEqual([
        { anchor: 'service-description', label: 'Service description' },
        { anchor: 'configuration', label: 'Configuration' },
      ]);
    });
  });
});
