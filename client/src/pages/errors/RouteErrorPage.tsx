import { isRouteErrorResponse, useRouteError } from 'react-router';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { Logo } from '../../components/layout/Logo.tsx';
import NotFoundPage from './NotFoundPage.tsx';

/**
 * Rendered by the router when a route throws while rendering or loading.
 * `standalone` is used at the root, where no layout (header) is available.
 */
export default function RouteErrorPage({ standalone = false }: { standalone?: boolean }) {
  const error = useRouteError();

  if (import.meta.env.DEV) console.error(error);

  const body =
    isRouteErrorResponse(error) && error.status === 404 ? (
      <NotFoundPage />
    ) : (
      <Container className="py-20">
        <DocumentTitle title="Something went wrong" />
        <ErrorState
          message="An unexpected error occurred. Reload the page to try again."
          onRetry={() => window.location.reload()}
        />
      </Container>
    );

  if (!standalone) return body;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center">
          <Logo />
        </Container>
      </header>
      <main>{body}</main>
    </div>
  );
}
