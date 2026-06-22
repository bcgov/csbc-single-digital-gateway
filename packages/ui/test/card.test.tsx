import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

describe('Card', () => {
  it('renders the full compound structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>
            <Button>Action</Button>
          </CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies the default size data attribute', () => {
    const { container } = render(<Card>content</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveAttribute('data-size', 'default');
  });

  it('applies the sm size data attribute', () => {
    const { container } = render(<Card size="sm">content</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveAttribute('data-size', 'sm');
  });

  it('assigns the correct data-slot to each subcomponent', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>T</CardTitle>
          <CardDescription>D</CardDescription>
        </CardHeader>
        <CardContent>C</CardContent>
        <CardFooter>F</CardFooter>
      </Card>,
    );
    expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-title"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-description"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-content"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-footer"]')).toBeInTheDocument();
  });

  it('merges a custom className onto the root', () => {
    const { container } = render(<Card className="custom-marker">x</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.className).toContain('custom-marker');
  });

  it('nests the title within the header', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Nested</CardTitle>
        </CardHeader>
      </Card>,
    );
    const header = container.querySelector<HTMLElement>('[data-slot="card-header"]');
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).getByText('Nested')).toBeInTheDocument();
  });
});
