import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ServicePublishModal,
  type PublishApplication,
} from '@/components/console/services/service-publish-modal';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderPublishModal(props: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  applications: PublishApplication[];
  onConfirm?: () => void;
  publishing?: boolean;
  error?: Error | null;
}) {
  return render(
    <ServicePublishModal
      open={props.open}
      onOpenChange={props.onOpenChange ?? (() => {})}
      applications={props.applications}
      onConfirm={props.onConfirm ?? (() => {})}
      publishing={props.publishing ?? false}
      error={props.error ?? null}
    />,
  );
}

describe('ServicePublishModal', () => {
  it('renders nothing when open is false', () => {
    renderPublishModal({ open: false, applications: [] });
    expect(screen.queryByRole('heading', { name: 'Publish service?' })).not.toBeInTheDocument();
  });

  it('renders modal with warning and disabled Publish when there are no applications', async () => {
    renderPublishModal({ open: true, applications: [] });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'This service has no application methods. Add at least one before publishing.',
      ),
    ).toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /publish/i });
    expect(publishBtn).toBeDisabled();
  });

  it('renders application details and enables Publish button when all methods have structure', async () => {
    const apps: PublishApplication[] = [
      { title: 'Zoning Form', hasStructure: true },
      { title: 'Permit Payment Form', hasStructure: true },
    ];
    renderPublishModal({ open: true, applications: apps });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();
    expect(
      screen.getByText('2 application methods will be published with the service:'),
    ).toBeInTheDocument();
    expect(screen.getByText('Zoning Form')).toBeInTheDocument();
    expect(screen.getByText('Permit Payment Form')).toBeInTheDocument();

    expect(screen.queryByText('no fields')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Add fields to every method before publishing.'),
    ).not.toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /publish/i });
    expect(publishBtn).not.toBeDisabled();
  });

  it('shows no fields labels and disables Publish button when some methods are structureless', async () => {
    const apps: PublishApplication[] = [
      { title: 'Zoning Form', hasStructure: true },
      { title: 'Permit Payment Form', hasStructure: false },
    ];
    renderPublishModal({ open: true, applications: apps });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();
    expect(screen.getByText('Zoning Form')).toBeInTheDocument();
    expect(screen.getByText('Permit Payment Form')).toBeInTheDocument();

    expect(screen.getByText('no fields')).toBeInTheDocument();
    expect(screen.getByText('Add fields to every method before publishing.')).toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /publish/i });
    expect(publishBtn).toBeDisabled();
  });

  it('triggers onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChangeSpy = vi.fn();
    renderPublishModal({ open: true, applications: [], onOpenChange: onOpenChangeSpy });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it('triggers onConfirm when publish button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmSpy = vi.fn();
    const apps: PublishApplication[] = [{ title: 'Zoning Form', hasStructure: true }];

    renderPublishModal({ open: true, applications: apps, onConfirm: onConfirmSpy });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /publish/i });
    await user.click(publishBtn);

    expect(onConfirmSpy).toHaveBeenCalled();
  });

  it('disables buttons and renders spinner when publishing is active', async () => {
    const apps: PublishApplication[] = [{ title: 'Zoning Form', hasStructure: true }];
    renderPublishModal({ open: true, applications: apps, publishing: true });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    const publishBtn = screen.getByRole('button', { name: /publish/i });

    expect(cancelBtn).toBeDisabled();
    expect(publishBtn).toBeDisabled();

    // Confirm that the spinner SVG is rendered inside the button
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders alert message when error is provided', async () => {
    renderPublishModal({
      open: true,
      applications: [],
      error: new Error('Network error publishing service'),
    });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Network error publishing service');
  });

  it('does not trigger onOpenChange(false) on Escape when publishing is active', async () => {
    const user = userEvent.setup();
    const onOpenChangeSpy = vi.fn();
    renderPublishModal({
      open: true,
      applications: [],
      publishing: true,
      onOpenChange: onOpenChangeSpy,
    });

    await user.keyboard('{Escape}');

    expect(onOpenChangeSpy).not.toHaveBeenCalled();
  });

  it('triggers onOpenChange(false) on Escape when publishing is not active', async () => {
    const user = userEvent.setup();
    const onOpenChangeSpy = vi.fn();
    renderPublishModal({
      open: true,
      applications: [],
      publishing: false,
      onOpenChange: onOpenChangeSpy,
    });

    await user.keyboard('{Escape}');

    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it('renders singular text when there is exactly one application method', async () => {
    const apps: PublishApplication[] = [{ title: 'Single Form', hasStructure: true }];
    renderPublishModal({ open: true, applications: apps });

    expect(await screen.findByRole('heading', { name: 'Publish service?' })).toBeInTheDocument();
    expect(
      screen.getByText('1 application method will be published with the service:'),
    ).toBeInTheDocument();
  });
});
