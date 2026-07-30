import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ExternalApplicationForm,
  isHttpsUrl,
} from '@/components/console/services/external-application-form';
describe('External Application Form Component Test Suite', () => {
  describe('isHttpsUrl', () => {
    it('returns true for valid https URLs', () => {
      expect(isHttpsUrl('https://example.com')).toBe(true);
      expect(isHttpsUrl('https://gov.bc.ca/path?query=1')).toBe(true);
    });

    it('returns false for non-https URLs', () => {
      expect(isHttpsUrl('http://example.com')).toBe(false);
      expect(isHttpsUrl('ftp://example.com')).toBe(false);
      expect(isHttpsUrl('not-a-url')).toBe(false);
    });
  });

  describe('ExternalApplicationForm', () => {
    it('renders with default empty state', () => {
      const handleCancel = vi.fn();
      const handleSubmit = vi.fn();

      render(
        <ExternalApplicationForm
          submitLabel="Create"
          submitting={false}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />,
      );

      expect(screen.getByLabelText('Label')).toHaveValue('');
      expect(screen.getByLabelText('Link URL')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
      expect(screen.getByText('Applicants open this link in a new tab.')).toBeInTheDocument();
    });

    it('renders with initial values', () => {
      render(
        <ExternalApplicationForm
          initial={{ label: 'Gov BC', url: 'https://gov.bc.ca' }}
          submitLabel="Save"
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Label')).toHaveValue('Gov BC');
      expect(screen.getByLabelText('Link URL')).toHaveValue('https://gov.bc.ca');
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    it('validates URL on blur', async () => {
      const user = userEvent.setup();
      render(
        <ExternalApplicationForm
          submitLabel="Create"
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const urlInput = screen.getByLabelText('Link URL');

      // Type an invalid URL and blur
      await user.type(urlInput, 'http://invalid-url.com');
      fireEvent.blur(urlInput);

      expect(screen.getByText('Enter a valid https:// address.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

      // Fix the URL
      await user.clear(urlInput);
      await user.type(urlInput, 'https://valid-url.com');

      expect(screen.queryByText('Enter a valid https:// address.')).not.toBeInTheDocument();
    });

    it('calls onSubmit with trimmed values when submitted', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      render(
        <ExternalApplicationForm
          submitLabel="Save"
          submitting={false}
          onSubmit={handleSubmit}
          onCancel={vi.fn()}
        />,
      );

      const labelInput = screen.getByLabelText('Label');
      const urlInput = screen.getByLabelText('Link URL');

      await user.type(labelInput, '  My Application  ');
      await user.type(urlInput, '  https://my-app.gov.bc.ca  ');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      expect(submitButton).not.toBeDisabled();
      await user.click(submitButton);

      expect(handleSubmit).toHaveBeenCalledWith({
        label: 'My Application',
        url: 'https://my-app.gov.bc.ca',
      });
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const handleCancel = vi.fn();

      render(
        <ExternalApplicationForm
          submitLabel="Save"
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={handleCancel}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(handleCancel).toHaveBeenCalled();
    });

    it('disables fields and buttons when submitting', () => {
      render(
        <ExternalApplicationForm
          initial={{ label: 'Gov BC', url: 'https://gov.bc.ca' }}
          submitLabel="Saving..."
          submitting={true}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Label')).toBeDisabled();
      expect(screen.getByLabelText('Link URL')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    });

    it('displays form-level error message when error prop is provided', () => {
      render(
        <ExternalApplicationForm
          submitLabel="Save"
          submitting={false}
          error="Something went wrong on the server."
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Something went wrong on the server.');
    });

    it('does not call onSubmit when submitted with invalid values', () => {
      const handleSubmit = vi.fn();
      const { container } = render(
        <ExternalApplicationForm
          submitLabel="Save"
          submitting={false}
          onSubmit={handleSubmit}
          onCancel={vi.fn()}
        />,
      );

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();

      // Submit directly on the form element when inputs are empty/invalid
      fireEvent.submit(form!);

      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });
});
