import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from '../../store/ui.ts';
import { CartMergeNotice } from './CartMergeNotice.tsx';

describe('<CartMergeNotice>', () => {
  beforeEach(() => useUi.setState({ cartNotice: null }));

  it('renders nothing without a notice', () => {
    const { container } = render(<CartMergeNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the notice politely and can be dismissed', async () => {
    useUi.setState({ cartNotice: 'We added your saved bag, but 1 item is no longer available.' });
    render(<CartMergeNotice />);
    expect(screen.getByRole('status')).toHaveTextContent('1 item is no longer available');

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useUi.getState().cartNotice).toBeNull();
  });
});
