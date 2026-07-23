import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState, useContext } from 'react';
import {
  PageChromeProvider,
  usePageChrome,
  useSetPageChrome,
  PageChromeContext,
} from '@/lib/page-chrome';

// Helper component that displays the current active chrome title
function ChromeDisplay() {
  const chrome = usePageChrome();
  return (
    <div data-testid="chrome-display">
      {chrome ? `${chrome.title} - ${chrome.description ?? ''}` : 'No Chrome'}
    </div>
  );
}

// Helper component that sets the page chrome
function ChromeSetter({ title, description }: { title: string; description?: string }) {
  useSetPageChrome({ title, description });
  return <div data-testid="setter-loaded">Setter: {title}</div>;
}

function ParentChildTest() {
  const [showChild, setShowChild] = useState(true);
  return (
    <PageChromeProvider>
      <ChromeSetter title="Parent Page" />
      {showChild && <ChromeSetter title="Child Page" />}
      <ChromeDisplay />
      <button onClick={() => setShowChild(false)}>Unmount Child</button>
    </PageChromeProvider>
  );
}

function OutsideProviderComponent() {
  useSetPageChrome({ title: 'Test Title' });
  const chrome = usePageChrome();
  return <div data-testid="outside-display">{chrome ? chrome.title : 'No Provider'}</div>;
}

function ChromeSetterWithBreadcrumb() {
  useSetPageChrome({
    title: 'Form Details',
    breadcrumb: <span data-testid="custom-breadcrumb">Details Page</span>,
  });
  return null;
}

function ChromeBreadcrumbDisplay() {
  const chrome = usePageChrome();
  return <div>{chrome?.breadcrumb}</div>;
}

function BreadcrumbComponent() {
  return (
    <PageChromeProvider>
      <ChromeSetterWithBreadcrumb />
      <ChromeBreadcrumbDisplay />
    </PageChromeProvider>
  );
}

describe('PageChrome system', () => {
  it('returns null chrome by default when stack is empty', () => {
    render(
      <PageChromeProvider>
        <ChromeDisplay />
      </PageChromeProvider>,
    );

    expect(screen.getByTestId('chrome-display')).toHaveTextContent('No Chrome');
  });

  it('pushes and updates chrome onto the stack successfully', () => {
    const { rerender } = render(
      <PageChromeProvider>
        <ChromeSetter title="Parent" description="Parent desc" />
        <ChromeSetter title="Overview" description="List of applications" />
        <ChromeDisplay />
      </PageChromeProvider>,
    );

    expect(screen.getByTestId('chrome-display')).toHaveTextContent(
      'Overview - List of applications',
    );

    // Update chrome values
    rerender(
      <PageChromeProvider>
        <ChromeSetter title="Parent" description="Parent desc" />
        <ChromeSetter title="Overview Updated" description="New list details" />
        <ChromeDisplay />
      </PageChromeProvider>,
    );

    expect(screen.getByTestId('chrome-display')).toHaveTextContent(
      'Overview Updated - New list details',
    );
  });

  it('manages a stack where child page overlays parent and restores parent on unmount', () => {
    render(<ParentChildTest />);

    // Child is mounted: active chrome should be Child Page (top of stack)
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Child Page');

    // Click button to unmount child
    fireEvent.click(screen.getByRole('button', { name: 'Unmount Child' }));

    // Child is unmounted: active chrome should revert to Parent Page
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Parent Page');
  });

  it('handles usePageChrome and useSetPageChrome when called outside provider', () => {
    render(<OutsideProviderComponent />);
    expect(screen.getByTestId('outside-display')).toHaveTextContent('No Provider');
  });

  it('supports breadcrumb ReactNode storage and retrieval', () => {
    render(<BreadcrumbComponent />);
    expect(screen.getByTestId('custom-breadcrumb')).toHaveTextContent('Details Page');
  });
});

function DirectPushTestComponent() {
  const ctx = useContext(PageChromeContext);
  return (
    <div>
      <button onClick={() => ctx?.push('test-id', { title: 'First' })}>Push First</button>
      <button onClick={() => ctx?.push('test-id', { title: 'Second' })}>Push Second</button>
      <button onClick={() => ctx?.push('other-id', { title: 'Other' })}>Push Other</button>
      <ChromeDisplay />
    </div>
  );
}

describe('PageChrome Provider direct access', () => {
  it('updates entry in place if already in the stack and maps non-matching ids', () => {
    render(
      <PageChromeProvider>
        <DirectPushTestComponent />
      </PageChromeProvider>,
    );

    // Push other-id
    fireEvent.click(screen.getByRole('button', { name: 'Push Other' }));
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Other -');

    // Push test-id (First)
    fireEvent.click(screen.getByRole('button', { name: 'Push First' }));
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('First -');

    // Push test-id again (Second) -> updates in place, hits other-id mapping (else branch)
    fireEvent.click(screen.getByRole('button', { name: 'Push Second' }));
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Second -');
  });
});
