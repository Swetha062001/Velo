import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUpdateProfile } from '../../hooks/useAuth.ts';
import { profileSchema, type ProfileValues } from '../../schemas/auth.schemas.ts';
import type { User } from '../../types/user.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';
import { Alert } from '../common/Alert.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';

export function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: (updated) => reset({ name: updated.name }),
      onError: (err) => applyServerErrors(err, setError, ['name']),
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {update.isSuccess && !isDirty && <Alert tone="success">Profile updated.</Alert>}
      {update.isError && !errors.name && <Alert tone="danger">{errorMessage(update.error)}</Alert>}

      <Input
        label="Full name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        value={user.email}
        readOnly
        hint="Your email is used to sign in and can't be changed here."
      />

      <Button type="submit" loading={update.isPending} disabled={!isDirty}>
        Save changes
      </Button>
    </form>
  );
}
