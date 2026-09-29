import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '../../hooks/useAuth.ts';
import {
  changePasswordSchema,
  PASSWORD_HINT,
  type ChangePasswordValues,
} from '../../schemas/auth.schemas.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';
import { Alert } from '../common/Alert.tsx';
import { Button } from '../common/Button.tsx';
import { PasswordInput } from '../common/PasswordInput.tsx';

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '' };

export function ChangePasswordForm() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => reset(EMPTY),
      onError: (err) => applyServerErrors(err, setError, ['currentPassword', 'newPassword']),
    }),
  );

  const hasFieldErrors = Boolean(errors.currentPassword || errors.newPassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {change.isSuccess && (
        <Alert tone="success">Password updated. Any other devices have been signed out.</Alert>
      )}
      {change.isError && !hasFieldErrors && (
        <Alert tone="danger">{errorMessage(change.error)}</Alert>
      )}

      <PasswordInput
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <PasswordInput
        label="New password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />

      <Button type="submit" variant="secondary" loading={change.isPending}>
        Update password
      </Button>
    </form>
  );
}
