import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AsyncSelect } from '@ui/inputs/async-select';

const loadOptions = vi.fn(async () => ({ options: [], hasMore: false }));

// react-select-async-paginate is jsdom-hostile for interaction (async menu,
// scroll paging), so this is render-safety + a11y + value resolution.
describe('AsyncSelect', () => {
  it('renders a combobox with the placeholder without loading immediately', () => {
    render(
      <AsyncSelect
        value={undefined}
        onChange={() => {}}
        loadOptions={loadOptions}
        placeholder="Search…"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Search…')).toBeInTheDocument();
  });

  it('renders a bound value as its own label when no resolveValue is given', () => {
    render(<AsyncSelect value="abc" onChange={() => {}} loadOptions={loadOptions} />);
    expect(screen.getByText('abc')).toBeInTheDocument();
  });
});
