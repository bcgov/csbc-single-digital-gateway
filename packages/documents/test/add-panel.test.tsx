import { mdiArrowRight, mdiFileDocumentOutline, mdiSourceBranch } from '@mdi/js';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddPanel, menuShift, type AddOption } from '../src/studio/add-panel';

function renderPanel(options: readonly AddOption[]) {
  const onChoose = vi.fn();
  render(
    <>
      <AddPanel
        label="Add after Details"
        options={options}
        onChoose={onChoose}
        style={{ transform: 'translate(10px, 20px)' }}
      />
      <button type="button">Elsewhere</button>
    </>,
  );
  return {
    user: userEvent.setup(),
    onChoose,
    trigger: screen.getByRole('button', { name: 'Add after Details' }),
  };
}

const menu = () => screen.queryByRole('menu', { name: 'What do you want to add?' });
const items = () => within(menu()!).getAllByRole('menuitem');

describe('AddPanel (doc 235 rules 1-4)', () => {
  it('is a closed + button that announces a menu (rule 1)', () => {
    const { trigger } = renderPanel(['connection', 'condition', 'form']);

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveClass('size-6', 'rounded-full');
    expect(menu()).not.toBeInTheDocument();
  });

  it('does not open on hover (rule 1)', async () => {
    const { user, trigger } = renderPanel(['form']);

    await user.hover(trigger);

    expect(menu()).not.toBeInTheDocument();
  });

  it("opens on click, headed by the question, listing a trailing edge's options with their icons (rule 2)", async () => {
    const { user, trigger } = renderPanel(['connection', 'condition', 'form']);

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('What do you want to add?')).toBeInTheDocument();
    expect(items().map((i) => i.textContent)).toEqual(['Connection', 'Condition', 'Form']);
    expect(items().map((i) => i.querySelector('svg path')?.getAttribute('d'))).toEqual([
      mdiArrowRight,
      mdiSourceBranch,
      mdiFileDocumentOutline,
    ]);
    expect(items()[0]).toHaveFocus();
  });

  it('lists only the options it is given, in that order (rule 2)', async () => {
    const { user, trigger } = renderPanel(['form', 'connection']);

    await user.click(trigger);

    expect(items().map((i) => i.textContent)).toEqual(['Form', 'Connection']);
  });

  it('zooms on an inner element, never on the positioned wrapper (rule 2)', async () => {
    const { user, trigger } = renderPanel(['form']);

    await user.click(trigger);

    const wrapper = trigger.closest<HTMLElement>('[data-slot="document-studio-add-panel"]')!;
    expect(wrapper.style.transform).toBe('translate(10px, 20px)');
    expect(wrapper).not.toHaveClass('animate-in');
    expect(menu()).toHaveClass('animate-in', 'zoom-in-75', 'fade-in-0');
  });

  it('chooses an option and closes (rule 3)', async () => {
    const { user, onChoose, trigger } = renderPanel(['connection', 'condition', 'form']);

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Condition' }));

    expect(onChoose).toHaveBeenCalledWith('condition');
    expect(menu()).not.toBeInTheDocument();
  });

  it('moves between items with the arrow keys (rule 3)', async () => {
    const { user, trigger } = renderPanel(['connection', 'condition', 'form']);

    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Condition' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Form' })).toHaveFocus();
  });

  it('closes on Escape, handing focus back to the + (rule 3)', async () => {
    const { user, onChoose, trigger } = renderPanel(['form']);

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(menu()).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('closes on a press outside it (rule 3)', async () => {
    const { user, onChoose, trigger } = renderPanel(['form']);

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(menu()).not.toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe('menuShift (doc 241 rule 4b)', () => {
  // A + centred at screen y 900 in a canvas spanning 100..1000, a 160px menu at zoom 0.5 (80px on screen).
  it('leaves a menu that fits where it is, centred on its +', () => {
    expect(menuShift({ centre: 500, height: 160, zoom: 0.5 }, { top: 100, bottom: 1000 })).toBe(0);
  });

  it('slides a menu that would cross the canvas bottom up, in flow units, keeping a margin', () => {
    // Bottom on screen 900 + 40 = 940; it may reach 1000 - 8 = 992, so it fits.
    expect(menuShift({ centre: 900, height: 160, zoom: 0.5 }, { top: 100, bottom: 1000 })).toBe(0);
    // Bottom on screen 980 + 40 = 1020: 28px too low → 56 flow units up.
    expect(menuShift({ centre: 980, height: 160, zoom: 0.5 }, { top: 100, bottom: 1000 })).toBe(
      -56,
    );
  });

  it('slides a menu that would cross the canvas top down', () => {
    // Top on screen 120 - 40 = 80: 28px too high (top + 8 = 108) → 56 flow units down.
    expect(menuShift({ centre: 120, height: 160, zoom: 0.5 }, { top: 100, bottom: 1000 })).toBe(56);
  });
});
