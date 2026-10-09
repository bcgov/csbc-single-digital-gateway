import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccordionGroupSettings } from '@/components/form-builder/accordion-group-settings';
import { createField, type ControlNode } from '@/components/form-builder/model';

const accordionNode = (patch: Partial<ControlNode> = {}): ControlNode => ({
  ...createField('accordiongroup'),
  key: 'faq_group',
  label: 'Frequently Asked Questions',
  ...patch,
});

describe('AccordionGroupSettings Component Test Suite', () => {
  it('renders with populated values and updates itemLabel on change and onClear', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const node = accordionNode({
      itemLabel: 'Question',
      minItems: 2,
      maxItems: 5,
      defaultOpen: 'first',
    });

    render(<AccordionGroupSettings node={node} onChange={onChange} />);

    // Item noun input
    const itemNounInput = screen.getByLabelText('Item noun');
    expect(itemNounInput).toHaveValue('Question');
    expect(screen.getByText(/Add question/)).toBeInTheDocument();

    // Type new noun
    fireEvent.change(itemNounInput, { target: { value: 'Section' } });
    expect(onChange).toHaveBeenCalledWith({ itemLabel: 'Section' });

    // Clear item noun via clear button (line 41)
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith({ itemLabel: 'item' });
  });

  it('updates minItems and maxItems using item bound helpers (including line 68)', () => {
    const onChange = vi.fn();
    const node = accordionNode({ minItems: 1, maxItems: 3 });

    render(<AccordionGroupSettings node={node} onChange={onChange} />);

    // Change minItems
    const minInput = screen.getByLabelText('Min items');
    expect(minInput).toHaveValue(1);
    fireEvent.change(minInput, { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minItems: 2 }));

    // Clear minItems to empty
    fireEvent.change(minInput, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minItems: undefined }));

    // Change maxItems (line 68)
    const maxInput = screen.getByLabelText('Max items');
    expect(maxInput).toHaveValue(3);
    fireEvent.change(maxInput, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxItems: 8 }));

    // Clear maxItems to empty
    fireEvent.change(maxInput, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxItems: undefined }));
  });

  it('renders default fallback values when node properties are undefined', () => {
    const {
      itemLabel: _itemLabel,
      minItems: _minItems,
      maxItems: _maxItems,
      defaultOpen: _defaultOpen,
      ...baseNode
    } = createField('accordiongroup');

    const sparseNodeAccordion: ControlNode = {
      ...baseNode,
      key: 'faq_sparse',
      label: 'Sparse Accordion',
      options: {},
      required: false,
    };

    render(<AccordionGroupSettings node={sparseNodeAccordion} onChange={vi.fn()} />);

    // Item noun defaults to "item"
    const itemNounInput = screen.getByLabelText('Item noun');
    expect(itemNounInput).toHaveValue('item');
    expect(screen.getByText(/Add item/)).toBeInTheDocument();

    // Min and Max items default to empty string
    expect(screen.getByLabelText('Min items')).toHaveValue(null);
    expect(screen.getByLabelText('Max items')).toHaveValue(null);
  });

  it('updates defaultOpen option on toggle change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const node = accordionNode({ defaultOpen: 'none' });

    render(<AccordionGroupSettings node={node} onChange={onChange} />);

    // Click "All" toggle button
    const allOption = screen.getByRole('button', { name: 'All' });
    await user.click(allOption);

    expect(onChange).toHaveBeenCalledWith({ defaultOpen: 'all' });
  });
});
