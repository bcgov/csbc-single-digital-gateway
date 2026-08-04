import {
  GeoDataProvider,
  type GeoCountryOption,
  type GeoData,
  type GeoStateOption,
} from '@repo/react/jsonforms-renderers';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldPreview, previewNodeForType } from '@/components/form-builder/field-card';

const COUNTRIES: GeoCountryOption[] = [
  { id: 39, name: 'Canada', iso2: 'CA', hasStates: true, hasPostal: true },
];
const STATES: Record<number, GeoStateOption[]> = {
  39: [{ id: 3, name: 'British Columbia', type: 'province', iso2: 'BC' }],
};
const geo: GeoData = {
  useCountries: () => ({ data: COUNTRIES, isLoading: false }),
  useStates: (id) => ({
    data: id === undefined ? undefined : (STATES[id] ?? []),
    isLoading: false,
  }),
};

describe('form builder — address field card preview', () => {
  it('reflects the Canada / British Columbia defaults', async () => {
    render(
      <GeoDataProvider value={geo}>
        <FieldPreview node={previewNodeForType('address')} />
      </GeoDataProvider>,
    );
    // Base UI's combobox renders two inputs sharing the value (the field + a mirror), so match all.
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Canada').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByDisplayValue('British Columbia').length).toBeGreaterThan(0);
  });
});
