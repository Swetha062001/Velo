import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '../../components/auth/AuthShell.tsx';
import { RegisterForm } from '../../components/auth/RegisterForm.tsx';
import { paths } from '../../routes/paths.ts';
import { safeRedirect } from '../../utils/redirect.ts';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');

  const loginHref = redirect
    ? `${paths.login}?redirect=${encodeURIComponent(redirect)}`
    : paths.login;

  return (
    <AuthShell
      title="Create account"
      subtitle="Join VELO to save favourites, track orders and check out faster."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={loginHref}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm onSuccess={() => navigate(safeRedirect(redirect), { replace: true })} />
    </AuthShell>
  );
}
