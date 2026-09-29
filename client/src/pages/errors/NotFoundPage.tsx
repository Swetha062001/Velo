import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { paths } from '../../routes/paths.ts';

export default function NotFoundPage() {
  return (
    <Container className="flex min-h-[60dvh] flex-col items-start justify-center py-20">
      <DocumentTitle title="Page not found" />
      <p className="font-display text-8xl font-black text-accent [font-stretch:120%] sm:text-9xl">
        404
      </p>
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">This page took a wrong turn.</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to={paths.home}>Back to home</ButtonLink>
        <ButtonLink to={paths.products} variant="secondary">
          Shop all
        </ButtonLink>
      </div>
    </Container>
  );
}
