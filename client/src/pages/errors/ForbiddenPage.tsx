import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { Logo } from '../../components/layout/Logo.tsx';
import { paths } from '../../routes/paths.ts';

/** Shown when a signed-in user opens an area they are not allowed to use. */
export default function ForbiddenPage() {
  return (
    <div className="min-h-dvh">
      <DocumentTitle title="Access denied" />
      <header className="border-b border-line">
        <Container className="flex h-16 items-center">
          <Logo />
        </Container>
      </header>
      <main>
        <Container className="flex min-h-[60dvh] flex-col items-start justify-center py-20">
          <p className="font-display text-8xl font-black text-accent [font-stretch:120%] sm:text-9xl">
            403
          </p>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
            This area is for admins only.
          </h1>
          <p className="mt-3 max-w-md text-ink-muted">
            Your account doesn't have permission to view this page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={paths.home}>Back to home</ButtonLink>
            <ButtonLink to={paths.account} variant="secondary">
              My account
            </ButtonLink>
          </div>
        </Container>
      </main>
    </div>
  );
}
