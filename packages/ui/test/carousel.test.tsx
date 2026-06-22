import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// embla-carousel measures the DOM and animates, neither of which run in jsdom,
// so these are render-safety + a11y/structure assertions only.
function renderCarousel() {
  return render(
    <Carousel>
      <CarouselContent>
        <CarouselItem>Slide 1</CarouselItem>
        <CarouselItem>Slide 2</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>,
  );
}

describe('Carousel', () => {
  it('exports are defined', () => {
    expect(Carousel).toBeDefined();
    expect(CarouselContent).toBeDefined();
    expect(CarouselItem).toBeDefined();
    expect(CarouselPrevious).toBeDefined();
    expect(CarouselNext).toBeDefined();
  });

  it('mounts without throwing', () => {
    expect(() => renderCarousel()).not.toThrow();
  });

  it('exposes the carousel region with the correct roledescription', () => {
    renderCarousel();
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    expect(region).toHaveAttribute('data-slot', 'carousel');
  });

  it('renders each item as a slide group', () => {
    renderCarousel();
    const slides = screen
      .getAllByRole('group')
      .filter((el) => el.getAttribute('aria-roledescription') === 'slide');
    expect(slides).toHaveLength(2);
    expect(within(slides[0] as HTMLElement).getByText('Slide 1')).toBeInTheDocument();
  });

  it('renders previous and next controls with sr-only labels', () => {
    renderCarousel();
    expect(screen.getByText('Previous slide')).toBeInTheDocument();
    expect(screen.getByText('Next slide')).toBeInTheDocument();
  });

  it('throws when a subcomponent is used outside a Carousel provider', () => {
    expect(() => render(<CarouselItem>orphan</CarouselItem>)).toThrow(
      /useCarousel must be used within a <Carousel \/>/,
    );
  });
});
