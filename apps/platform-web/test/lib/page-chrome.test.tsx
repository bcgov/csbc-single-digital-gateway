import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { PageChromeProvider, usePageChrome, useSetPageChrome } from '@/lib/page-chrome';

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
        <ChromeSetter title="Overview Updated" description="New list details" />
        <ChromeDisplay />
      </PageChromeProvider>,
    );

    expect(screen.getByTestId('chrome-display')).toHaveTextContent(
      'Overview Updated - New list details',
    );
  });

  it('manages a stack where child page overlays parent and restores parent on unmount', () => {
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

    render(<ParentChildTest />);

    // Child is mounted: active chrome should be Child Page (top of stack)
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Child Page');

    // Click button to unmount child
    fireEvent.click(screen.getByRole('button', { name: 'Unmount Child' }));

    // Child is unmounted: active chrome should revert to Parent Page
    expect(screen.getByTestId('chrome-display')).toHaveTextContent('Parent Page');
  });
});
