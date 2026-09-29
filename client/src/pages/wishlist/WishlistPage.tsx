import { Heart } from 'lucide-react';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { ProductGridSkeleton } from '../../components/product/ProductGrid.tsx';
import { WishlistItemCard } from '../../components/wishlist/WishlistItemCard.tsx';
import { useWishlist } from '../../hooks/useWishlist.ts';
import { paths } from '../../routes/paths.ts';

export default function WishlistPage() {
  const { data: wishlist, isPending, isError, refetch } = useWishlist();

  return (
    <Container className="py-10 sm:py-14">
      <DocumentTitle title="Wishlist" />
      <div className="flex items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <h1 className="text-4xl font-extrabold [font-stretch:105%] sm:text-5xl">Wishlist</h1>
          <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
            {wishlist ? `${wishlist.count} saved ${wishlist.count === 1 ? 'item' : 'items'}` : ' '}
          </p>
        </div>
      </div>

      <div className="mt-10">
        {isPending ? (
          <ProductGridSkeleton count={4} columns={4} />
        ) : isError ? (
          <ErrorState message="We couldn't load your wishlist." onRetry={() => refetch()} />
        ) : wishlist.items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Tap the heart on any product to save it here for later."
            action={<ButtonLink to={paths.products}>Explore the collection</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {wishlist.items.map((item) => (
              <li key={item.productId}>
                <WishlistItemCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
