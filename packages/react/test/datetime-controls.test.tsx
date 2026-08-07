import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';
import { displayRenderers } from '../src/jsonforms-renderers-display';

function Form({
  schema,
  uischema,
  initial = {},
}: {
  schema: JsonSchema;
  uischema: UISchemaElement;
  initial?: Record<string, unknown>;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={[]}
      onChange={({ data: next }) => setData(next as Record<string, unknown>)}
    />
  );
}

// ── Date range (feature 157, Step 2) ─────────────────────────────────────────────────────────────
const rangeSchema: JsonSchema = {
  type: 'object',
  properties: {
    period: {
      type: 'object',
      properties: {
        start: { type: 'string', format: 'date' },
        end: { type: 'string', format: 'date' },
      },
    },
  },
};
const rangeUi = {
  type: 'Control',
  scope: '#/properties/period',
  label: 'Period',
  options: { format: 'daterange' },
} as UISchemaElement;

describe('DateRangeControl', () => {
  it('renders a masked input with a calendar trigger', () => {
    render(<Form schema={rangeSchema} uischema={rangeUi} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeInTheDocument();
  });

  it('renders the stored start - end in the masked input', () => {
    render(
      <Form
        schema={rangeSchema}
        uischema={rangeUi}
        initial={{ period: { start: '2026-03-01', end: '2026-03-08' } }}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('03/01/2026 - 03/08/2026');
  });
});

describe('DateRangeDisplay', () => {
  it('renders the range read-only as start – end', () => {
    render(
      <JsonForms
        schema={rangeSchema}
        uischema={rangeUi}
        data={{ period: { start: '2026-03-01', end: '2026-03-08' } }}
        renderers={displayRenderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/03\/01\/2026\s*–\s*03\/08\/2026/)).toBeInTheDocument();
  });

  it('renders an em-dash when empty', () => {
    render(
      <JsonForms
        schema={rangeSchema}
        uischema={rangeUi}
        data={{}}
        renderers={displayRenderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// ── Time (feature 157, Step 3) ───────────────────────────────────────────────────────────────────
const timeSchema: JsonSchema = {
  type: 'object',
  properties: { start_at: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' } },
};
const timeUi = {
  type: 'Control',
  scope: '#/properties/start_at',
  label: 'Start time',
  options: { format: 'time' },
} as UISchemaElement;

describe('TimeControl', () => {
  it('renders hour, minute and AM/PM controls', () => {
    render(<Form schema={timeSchema} uischema={timeUi} />);
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Minute')).toBeInTheDocument();
    expect(screen.getByLabelText('AM or PM')).toBeInTheDocument();
  });
});

describe('TimeDisplay', () => {
  it('renders the stored 24h time read-only in 12-hour format', () => {
    render(
      <JsonForms
        schema={timeSchema}
        uischema={timeUi}
        data={{ start_at: '14:30' }}
        renderers={displayRenderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });
});

// ── Date-time (feature 157, Step 4) ──────────────────────────────────────────────────────────────
const dtSchema: JsonSchema = {
  type: 'object',
  properties: {
    when: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T([01]\\d|2[0-3]):[0-5]\\d$' },
  },
};
const dtUi = {
  type: 'Control',
  scope: '#/properties/when',
  label: 'When',
  options: { format: 'datetime' },
} as UISchemaElement;

describe('DateTimeControl', () => {
  it('renders a date input plus time controls', () => {
    render(<Form schema={dtSchema} uischema={dtUi} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('AM or PM')).toBeInTheDocument();
  });
});

describe('DateTimeDisplay', () => {
  it('renders the stored datetime read-only as MM/dd/yyyy h:mm AM', () => {
    render(
      <JsonForms
        schema={dtSchema}
        uischema={dtUi}
        data={{ when: '2026-03-01T14:30' }}
        renderers={displayRenderers}
        cells={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('03/01/2026 2:30 PM')).toBeInTheDocument();
  });
});
