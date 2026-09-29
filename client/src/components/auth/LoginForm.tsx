import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLogin } from '../../hooks/useAuth.ts';
import { loginSchema, type LoginValues } from '../../schemas/auth.schemas.ts';
import type { User } from '../../types/user.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';
import { Alert } from '../common/Alert.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { PasswordInput } from '../common/PasswordInput.tsx';

export function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess,
      onError: (err) => applyServerErrors(err, setError, ['email', 'password']),
    }),
  );

  const showBanner = login.isError && !errors.email && !errors.password;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {showBanner && <Alert tone="danger">{errorMessage(login.error)}</Alert>}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" size="lg" fullWidth loading={login.isPending}>
        Sign in
      </Button>
    </form>
  );
}
