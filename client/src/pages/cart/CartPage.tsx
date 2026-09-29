import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { CartLineItem } from '../../components/cart/CartLineItem.tsx';
import { CartMergeNotice } from '../../components/cart/CartMergeNotice.tsx';
import { OrderSummary } from '../../components/cart/OrderSummary.tsx';
import { Alert } from '../../components/common/Alert.tsx';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { useCart } from '../../hooks/useCart.ts';
import { paths } from '../../routes/paths.ts';

export default function CartPage() {
  const { cart, isPending, isError, refetch, signedIn } = useCart();

  return (
    <Container className="py-10 sm:py-14">
      <DocumentTitle title="Your bag" />
      <h1 className="text-4xl font-extrabold [font-stretch:105%] sm:text-5xl">Your bag</h1>

      {isPending ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-32 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : isError || !cart ? (
        <ErrorState message="We couldn't load your bag." onRetry={() => refetch()} />
      ) : cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Looks like you haven't added anything yet."
          action={<ButtonLink to={paths.products}>Start shopping</ButtonLink>}
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <section aria-label="Items in your bag" className="min-w-0">
            <p className="text-sm text-ink-muted">
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
            </p>
            <CartMergeNotice className="mt-4" />
            {cart.hasIssues && (
              <Alert tone="danger" className="mt-4">
                Some items need your attention before you can check out.
              </Alert>
            )}
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {cart.items.map((line) => (
                <CartLineItem key={line.id} line={line} />
              ))}
            </ul>
            <Link
              to={paths.products}
              className="mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            >
              ← Continue shopping
            </Link>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary cart={cart}>
              <ButtonLink
                to={paths.checkout}
                size="lg"
                fullWidth
                aria-disabled={cart.hasIssues || undefined}
                onClick={(e) => cart.hasIssues && e.preventDefault()}
              >
                {signedIn ? 'Checkout' : 'Sign in to check out'}
              </ButtonLink>
              {!signedIn && (
                <p className="text-center text-xs text-ink-muted">
                  Your bag is saved on this device and moves to your account when you sign in.
                </p>
              )}
            </OrderSummary>
          </aside>
        </div>
      )}
    </Container>
  );
}
