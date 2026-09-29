import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRegister } from '../../hooks/useAuth.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { PASSWORD_HINT, registerSchema, type RegisterValues } from '../../schemas/auth.schemas.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';
import { Alert } from '../common/Alert.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { PasswordInput } from '../common/PasswordInput.tsx';

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // The first field is auto-focused: validating on blur would flash "Enter your email" and
    // shift the layout as soon as the shopper clicks anything else. Validate on submit, then live.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = handleSubmit((values) =>
    registerUser.mutate(values, {
      onSuccess,
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          setError('email', { type: 'server', message: err.message });
          return;
        }
        applyServerErrors(err, setError, ['name', 'email', 'password']);
      },
    }),
  );

  const hasFieldErrors = Boolean(errors.name || errors.email || errors.password);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {registerUser.isError && !hasFieldErrors && (
        <Alert tone="danger">{errorMessage(registerUser.error)}</Alert>
      )}

      <Input
        label="Full name"
        autoComplete="name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordInput
        label="Password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" size="lg" fullWidth loading={registerUser.isPending}>
        Create account
      </Button>
    </form>
  );
}
