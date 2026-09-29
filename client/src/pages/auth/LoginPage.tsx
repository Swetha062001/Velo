import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '../../components/auth/AuthShell.tsx';
import { LoginForm } from '../../components/auth/LoginForm.tsx';
import { paths } from '../../routes/paths.ts';
import { homeFor, safeRedirect } from '../../utils/redirect.ts';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');

  const registerHref = redirect
    ? `${paths.register}?redirect=${encodeURIComponent(redirect)}`
    : paths.register;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Sign in to your VELO account."
      footer={
        <>
          New to VELO?{' '}
          <Link
            to={registerHref}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm
        onSuccess={(user) =>
          navigate(safeRedirect(redirect, homeFor(user.role)), { replace: true })
        }
      />
    </AuthShell>
  );
}
