import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Documents" value={42} />);

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render badge when provided', () => {
    render(
      <StatCard title="Errors" value={5} badge={<span data-testid="badge">3% failed</span>} />
    );

    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText('3% failed')).toBeInTheDocument();
  });

  it('should not render badge when not provided', () => {
    const { container } = render(<StatCard title="Users" value={100} />);

    expect(container.querySelector('[data-testid="badge"]')).toBeNull();
  });

  it('should format large numbers with locale', () => {
    render(<StatCard title="Total" value={1234567} />);

    // toLocaleString() formats numbers (exact format depends on locale)
    const valueEl = screen.getByText(/1.*234.*567/);
    expect(valueEl).toBeInTheDocument();
  });
});
