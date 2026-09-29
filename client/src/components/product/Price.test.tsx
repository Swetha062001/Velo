import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Price } from './Price.tsx';

describe('<Price>', () => {
  it('shows the price alone when there is no discount', () => {
    render(<Price pricePaise={549900} />);
    expect(screen.getByText('₹5,499')).toBeInTheDocument();
    expect(screen.queryByText(/off/)).not.toBeInTheDocument();
  });

  it('shows the old price (announced as "Was") and the discount', () => {
    const { container } = render(<Price pricePaise={799900} compareAtPricePaise={899900} />);
    expect(screen.getByText('11% off')).toBeInTheDocument();
    expect(container.querySelector('s')).toHaveTextContent('Was ₹8,999');
  });
});
