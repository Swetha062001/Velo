import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../hooks/useCart.ts';
import { paths } from '../../routes/paths.ts';
import { useUi } from '../../store/ui.ts';
import { formatPrice } from '../../utils/money.ts';
import { ButtonLink } from '../common/Button.tsx';
import { Drawer } from '../common/Drawer.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import { Spinner } from '../common/Spinner.tsx';
import { CartLineItem } from './CartLineItem.tsx';
import { FreeShippingProgress } from './OrderSummary.tsx';

/** Slide-in bag shown after "Add to bag" — quick review without leaving the page. */
export function CartDrawer() {
  const open = useUi((s) => s.cartDrawerOpen);
  const close = useUi((s) => s.closeCartDrawer);
  const { cart, isPending } = useCart();

  const count = cart?.itemCount ?? 0;

  return (
    <Drawer
      open={open}
      onClose={close}
      title={count ? `Your bag (${count})` : 'Your bag'}
      footer={
        cart && cart.items.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(cart.subtotalPaise)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ButtonLink to={paths.cart} variant="secondary" onClick={close}>
                View bag
              </ButtonLink>
              <ButtonLink
                to={paths.checkout}
                onClick={close}
                aria-disabled={cart.hasIssues || undefined}
              >
                Checkout
              </ButtonLink>
            </div>
          </div>
        ) : undefined
      }
    >
      {isPending ? (
        <div className="flex justify-center py-16 text-ink-muted">
          <Spinner label="Loading your bag" />
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Find your next pair in the collection."
          action={
            <ButtonLink to={paths.products} onClick={close}>
              Shop now
            </ButtonLink>
          }
        />
      ) : (
        <>
          <FreeShippingProgress cart={cart} />
          <ul className="divide-y divide-line">
            {cart.items.map((line) => (
              <CartLineItem key={line.id} line={line} compact />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}
