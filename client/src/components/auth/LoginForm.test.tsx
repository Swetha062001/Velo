import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render.tsx';
import { LoginForm } from './LoginForm.tsx';

afterEach(() => vi.unstubAllGlobals());

function setup(response: Response) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  const onSuccess = vi.fn();
  renderWithProviders(<LoginForm onSuccess={onSuccess} />);
  return { fetchMock, onSuccess, user: userEvent.setup() };
}

describe('<LoginForm>', () => {
  it('validates on the client before calling the API, with accessible errors', async () => {
    const { fetchMock, user } = setup(Response.json({}));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/enter your email/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in and hands the user to onSuccess', async () => {
    const userData = { id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'USER' };
    const { fetchMock, onSuccess, user } = setup(Response.json({ data: { user: userData } }));

    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'runFast42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]![0]).toMatchObject({ email: 'asha@example.com' });
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [URL, RequestInit];
    expect(String(url)).toMatch(/\/auth\/login$/);
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'asha@example.com',
      password: 'runFast42',
    });
  });

  it('shows the server error without revealing which field was wrong', async () => {
    const { onSuccess, user } = setup(
      Response.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' } },
        { status: 401 },
      ),
    );
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
