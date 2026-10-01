import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DocumentInspector } from '../src/studio/document-inspector';
import { form } from './funnel-fixtures';

const content = { schema: { type: 'object' }, variants: { default: form('A') } };

describe('DocumentInspector', () => {
  it('floats a panel titled Inspector, with Settings pressed before JSON', () => {
    render(<DocumentInspector content={content} open={false} onOpenChange={() => {}} />);
    const panel = screen.getByRole('region', { name: 'Inspector' });
    const settings = screen.getByRole('button', { name: 'Settings' });
    const json = screen.getByRole('button', { name: 'JSON' });

    expect(panel).toHaveClass('absolute', 'top-3', 'right-3');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Inspector');
    expect(settings).toHaveAttribute('aria-pressed', 'true');
    expect(json).toHaveAttribute('aria-pressed', 'false');
    expect(settings.compareDocumentPosition(json) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel.querySelector('pre')).toBeNull();
  });

  it('titles the JSON view Schema and shows the whole content, staying there when JSON is pressed again', async () => {
    const user = userEvent.setup();
    render(<DocumentInspector content={content} open={false} onOpenChange={() => {}} />);
    const json = screen.getByRole('button', { name: 'JSON' });

    await user.click(json);
    await user.click(json);

    expect(json).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Schema');
    expect(
      screen.getByRole('region', { name: 'Inspector' }).querySelector('pre')?.textContent,
    ).toBe(JSON.stringify(content, null, 2));

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Inspector');
  });
});
