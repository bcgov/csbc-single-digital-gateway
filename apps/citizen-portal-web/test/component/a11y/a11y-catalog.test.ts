import { describe, expect, it } from 'vitest';
import { findA11yMetadata, getA11yMetadata } from '@/a11y/a11y-catalog';
import breadcrumbA11y from '@/a11y/breadcrumb.a11y';
import formElementsA11y from '@/a11y/form-elements-reference-page.a11y';
import iconA11y from '@/a11y/icon-reference-page.a11y';
import statusBannerA11y from '@/a11y/status-banner.a11y';

describe('a11y-catalog', () => {
  describe('findA11yMetadata', () => {
    it('Should returns metadata for app-local components', () => {
      expect(findA11yMetadata('breadcrumb')).toEqual(breadcrumbA11y);
      expect(findA11yMetadata('status-banner')).toEqual(statusBannerA11y);
      expect(findA11yMetadata('icons')).toEqual(iconA11y);
      expect(findA11yMetadata('form-elements')).toEqual(formElementsA11y);
    });

    it('Should returns metadata for components from @repo/ui catalog', () => {
      const buttonMeta = findA11yMetadata('button');
      expect(buttonMeta).toBeDefined();
      expect(buttonMeta?.component).toBe('button');
    });

    it('Should returns undefined when component metadata is not found', () => {
      expect(findA11yMetadata('unknown-component')).toBeUndefined();
    });
  });

  describe('getA11yMetadata', () => {
    it('Should returns metadata when component exists', () => {
      const breadcrumbMeta = getA11yMetadata('breadcrumb');
      expect(breadcrumbMeta).toEqual(breadcrumbA11y);

      const buttonMeta = getA11yMetadata('button');
      expect(buttonMeta.component).toBe('button');
    });

    it('Should throw a descriptive error when component is missing or typoed', () => {
      expect(() => getA11yMetadata('non-existent-comp')).toThrowError(
        'No accessibility metadata found for component "non-existent-comp" — check the .a11y.ts sidecar\'s "component" field and that packages/ui\'s catalog was regenerated (npm run gen:a11y-catalog -w @repo/ui).',
      );
    });
  });
});
