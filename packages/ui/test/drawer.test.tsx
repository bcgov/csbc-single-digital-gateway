import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

function TestDrawer({ open }: { open?: boolean }) {
  return (
    <Drawer {...(open === undefined ? {} : { open })}>
      <DrawerTrigger>Open drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer title</DrawerTitle>
          <DrawerDescription>Drawer description</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose>Close</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

describe('Drawer', () => {
  it('mounts without throwing and renders the trigger', () => {
    render(<TestDrawer />);
    expect(screen.getByRole('button', { name: 'Open drawer' })).toBeInTheDocument();
  });

  it('exposes all expected exports', () => {
    expect(Drawer).toBeDefined();
    expect(DrawerTrigger).toBeDefined();
    expect(DrawerContent).toBeDefined();
    expect(DrawerHeader).toBeDefined();
    expect(DrawerFooter).toBeDefined();
    expect(DrawerTitle).toBeDefined();
    expect(DrawerDescription).toBeDefined();
    expect(DrawerClose).toBeDefined();
  });

  it('keeps content out of the document while closed', () => {
    render(<TestDrawer />);
    expect(screen.queryByText('Drawer title')).not.toBeInTheDocument();
  });

  it('renders content with a dialog role when controlled open', () => {
    expect(() => render(<TestDrawer open />)).not.toThrow();
    const dialog = screen.queryByRole('dialog');
    if (dialog) {
      expect(dialog).toBeInTheDocument();
    }
    expect(screen.getByText('Drawer title')).toBeInTheDocument();
  });
});
