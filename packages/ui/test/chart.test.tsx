import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart } from 'recharts';

// recharts depends on real DOM measurement (ResponsiveContainer/SVG layout) that
// jsdom cannot provide, so these are render-safety + structure assertions only.
const config = {
  visitors: { label: 'Visitors', color: '#2563eb' },
} satisfies ChartConfig;

const data = [
  { month: 'Jan', visitors: 100 },
  { month: 'Feb', visitors: 200 },
];

describe('Chart', () => {
  it('exports are defined', () => {
    expect(ChartContainer).toBeDefined();
    expect(ChartTooltip).toBeDefined();
    expect(ChartTooltipContent).toBeDefined();
    expect(ChartLegend).toBeDefined();
    expect(ChartLegendContent).toBeDefined();
    expect(ChartStyle).toBeDefined();
  });

  it('mounts the container without throwing', () => {
    expect(() =>
      render(
        <ChartContainer config={config}>
          <BarChart data={data}>
            <Bar dataKey="visitors" />
          </BarChart>
        </ChartContainer>,
      ),
    ).not.toThrow();
  });

  it('renders the chart slot wrapper with a chart id', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <BarChart data={data}>
          <Bar dataKey="visitors" />
        </BarChart>
      </ChartContainer>,
    );
    const chart = container.querySelector('[data-slot="chart"]');
    expect(chart).toBeInTheDocument();
    expect(chart?.getAttribute('data-chart')).toMatch(/^chart-/);
  });

  it('injects a style element with the configured color variable', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <BarChart data={data}>
          <Bar dataKey="visitors" />
        </BarChart>
      </ChartContainer>,
    );
    const style = container.querySelector('style');
    expect(style).toBeInTheDocument();
    expect(style?.innerHTML).toContain('--color-visitors');
  });

  it('renders ChartStyle as null when no colors are configured', () => {
    const { container } = render(
      <ChartStyle id="chart-empty" config={{ visitors: { label: 'Visitors' } }} />,
    );
    expect(container.querySelector('style')).not.toBeInTheDocument();
  });

  it('merges a custom className on the container', () => {
    const { container } = render(
      <ChartContainer config={config} className="custom-marker">
        <BarChart data={data}>
          <Bar dataKey="visitors" />
        </BarChart>
      </ChartContainer>,
    );
    expect(container.querySelector('[data-slot="chart"]')?.className).toContain('custom-marker');
  });
});
