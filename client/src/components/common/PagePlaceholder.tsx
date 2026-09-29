import { Construction } from 'lucide-react';
import { paths } from '../../routes/paths.ts';
import { Container } from '../layout/Container.tsx';
import { ButtonLink } from './Button.tsx';
import { DocumentTitle } from './DocumentTitle.tsx';
import { EmptyState } from './EmptyState.tsx';

interface PagePlaceholderProps {
  title: string;
  phase: number;
  description?: string;
  /** Set false when the parent layout already provides the page container. */
  contained?: boolean;
}

/** Temporary page body for routes whose feature arrives in a later phase. */
export function PagePlaceholder({
  title,
  phase,
  description,
  contained = true,
}: PagePlaceholderProps) {
  const content = (
    <>
      <DocumentTitle title={title} />
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <div className="mt-8 rounded-lg border border-dashed border-line-strong">
        <EmptyState
          icon={Construction}
          title={`Arriving in Phase ${phase}`}
          description={description ?? 'This page is part of the routing skeleton.'}
          action={
            <ButtonLink to={paths.home} variant="secondary" size="sm">
              Back to home
            </ButtonLink>
          }
        />
      </div>
    </>
  );

  return contained ? <Container className="py-12 sm:py-16">{content}</Container> : content;
}
