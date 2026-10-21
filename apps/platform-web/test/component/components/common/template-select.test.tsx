import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TemplateSelect } from '@/components/common/template-select';
import type { DocumentType } from '@/lib/templates';

// Doc 228 rule 3.

afterEach(() => {
  vi.restoreAllMocks();
});

const entry = (id: string, type: DocumentType, title: string | null) => ({
  template: { id, workspaceId: null, type, createdAt: '', updatedAt: '' },
  published: { id: `${id}-v1`, versionNumber: 1, status: 'published', title },
});

function mockCatalog(items: ReturnType<typeof entry>[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    expect(String(input)).toMatch(/\/v1\/templates$/);
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

/** A host that owns the value, like the create modals, and shows it. */
function renderSelect(type: DocumentType) {
  const changes: (string | undefined)[] = [];
  function Host() {
    const [value, setValue] = useState<string | undefined>(undefined);
    return (
      <>
        <TemplateSelect
          id="template"
          type={type}
          value={value}
          onChange={(next) => {
            changes.push(next);
            setValue(next);
          }}
        />
        <output data-testid="value">{value ?? 'none'}</output>
      </>
    );
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <Host />
    </QueryClientProvider>,
  );
  return { changes };
}

describe('TemplateSelect (doc 228)', () => {
  it('preselects and hides the picker when exactly one template is published', async () => {
    mockCatalog([entry('tpl-1', 'services.service', 'Standard service')]);
    const { changes } = renderSelect('services.service');

    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('tpl-1'));
    expect(changes).toEqual(['tpl-1']);
    expect(screen.queryByLabelText('Template')).not.toBeInTheDocument();
  });

  it('asks an admin to publish one when none is published', async () => {
    mockCatalog([]);
    renderSelect('services.service-agreement');

    expect(
      await screen.findByText(
        'No published service agreement template — ask an admin to publish one.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('none');
  });

  it('requires a choice among several, labelled by published title', async () => {
    mockCatalog([
      entry('tpl-1', 'services.service', 'Standard service'),
      entry('tpl-2', 'services.service', null),
    ]);
    renderSelect('services.service');

    const select = await screen.findByLabelText('Template');
    expect(select).toBeRequired();
    expect(
      Array.from((select as HTMLSelectElement).options).map((option) => option.textContent),
    ).toEqual(['Choose a template…', 'Standard service', 'Untitled template']);
    // Nothing is chosen for the author.
    expect(screen.getByTestId('value')).toHaveTextContent('none');

    await userEvent.selectOptions(select, 'tpl-2');
    expect(screen.getByTestId('value')).toHaveTextContent('tpl-2');
  });

  it('lists only templates of the requested type', async () => {
    mockCatalog([
      entry('tpl-svc', 'services.service', 'Standard service'),
      entry('tpl-a', 'services.service-agreement', 'Terms A'),
      entry('tpl-b', 'services.service-agreement', 'Terms B'),
    ]);
    renderSelect('services.service-agreement');

    const select = await screen.findByLabelText('Template');
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.value)).toEqual(
      ['', 'tpl-a', 'tpl-b'],
    );
  });
});
