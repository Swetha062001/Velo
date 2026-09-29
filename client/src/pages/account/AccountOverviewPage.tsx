import type { ReactNode } from 'react';
import { ChangePasswordForm } from '../../components/account/ChangePasswordForm.tsx';
import { ProfileForm } from '../../components/account/ProfileForm.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { formatDate } from '../../utils/format.ts';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line py-10 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

export default function AccountOverviewPage() {
  // RequireAuth guarantees a user here.
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <>
      <DocumentTitle title="My account" />

      <header className="pb-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Hi, {user.name.split(' ')[0]}</h1>
          {user.role === 'ADMIN' && <Badge tone="accent">Admin</Badge>}
        </div>
        <p className="mt-2 text-sm text-ink-muted">Member since {formatDate(user.createdAt)}</p>
      </header>

      <Section title="Profile" description="Your name as it appears on orders and emails.">
        <ProfileForm user={user} />
      </Section>

      <Section
        title="Password"
        description="Changing your password signs you out on every other device."
      >
        <ChangePasswordForm />
      </Section>
    </>
  );
}
