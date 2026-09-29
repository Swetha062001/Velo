import { useQueryClient } from '@tanstack/react-query';
import { Lock, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { AddressForm } from '../../components/account/AddressForm.tsx';
import { AddressLines } from '../../components/account/AddressLines.tsx';
import { OrderSummary } from '../../components/cart/OrderSummary.tsx';
import { CheckoutSteps } from '../../components/checkout/CheckoutSteps.tsx';
import type { CheckoutStep } from '../../components/checkout/steps.ts';
import { Alert } from '../../components/common/Alert.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button, ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { FullPageSpinner } from '../../components/common/Spinner.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { OrderLineItems } from '../../components/order/OrderLineItems.tsx';
import { PAYMENT_METHODS } from '../../config/orders.ts';
import { useAddresses } from '../../hooks/useAddresses.ts';
import { useCart } from '../../hooks/useCart.ts';
import { usePlaceOrder } from '../../hooks/useOrders.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { CART_KEY } from '../../lib/cartSync.ts';
import { paths } from '../../routes/paths.ts';
import type { PaymentMethod } from '../../types/order.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';
import { formatPrice } from '../../utils/money.ts';

function StepCard({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-sans text-lg font-semibold tracking-normal">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isPending: cartPending, isError: cartError, refetch } = useCart();
  const addresses = useAddresses();
  const placeOrder = usePlaceOrder();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOCK_CARD');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // One key per checkout: a retried or double-clicked "Place order" can never create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (cartPending || addresses.isPending) return <FullPageSpinner />;
  if (cartError || addresses.isError || !cart) {
    return (
      <Container className="py-16">
        <ErrorState
          message="We couldn't load checkout."
          onRetry={() => {
            void refetch();
            void addresses.refetch();
          }}
        />
      </Container>
    );
  }
  if (cart.items.length === 0 && !placeOrder.isSuccess) {
    return (
      <Container className="py-16">
        <DocumentTitle title="Checkout" />
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Add something you love before checking out."
          action={<ButtonLink to={paths.products}>Shop now</ButtonLink>}
        />
      </Container>
    );
  }

  const savedAddresses = addresses.data;
  const address =
    savedAddresses.find((a) => a.id === chosenAddressId) ??
    savedAddresses.find((a) => a.isDefault) ??
    savedAddresses[0];
  const showAddressForm = addingAddress || savedAddresses.length === 0;

  function handlePlaceOrder() {
    if (!address || !cart) return;
    setNotice(null);
    placeOrder.mutate(
      {
        addressId: address.id,
        idempotencyKey,
        paymentMethod,
        expectedTotalPaise: cart.totalPaise,
        simulateDecline: simulateDecline || undefined,
      },
      {
        onSuccess: (order) => navigate(paths.checkoutSuccess(order.orderNumber), { replace: true }),
        onError: (err) => {
          if (!(err instanceof ApiError)) return;
          if (err.code === 'PRICE_CHANGED' || err.code === 'CART_HAS_ISSUES') {
            void queryClient.invalidateQueries({ queryKey: CART_KEY });
            setNotice(err.message);
            setStep('review');
          }
          if (err.code === 'CART_EMPTY') navigate(paths.cart, { replace: true });
        },
      },
    );
  }

  return (
    <Container className="py-10 sm:py-14">
      <DocumentTitle title="Checkout" />
      <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-4xl font-extrabold [font-stretch:105%] sm:text-5xl">Checkout</h1>
        <CheckoutSteps current={step} onSelect={setStep} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
        <div className="min-w-0 space-y-6">
          {notice && <Alert tone="danger">{notice}</Alert>}
          {cart.hasIssues && (
            <Alert tone="danger">
              Some items in your bag need attention.{' '}
              <Link to={paths.cart} className="font-semibold underline underline-offset-2">
                Review your bag
              </Link>
            </Alert>
          )}

          {/* 1. Shipping */}
          {step === 'shipping' && (
            <StepCard title="Shipping address">
              {showAddressForm ? (
                <AddressForm
                  submitLabel="Save and use this address"
                  onDone={(created) => {
                    setChosenAddressId(created.id);
                    setAddingAddress(false);
                  }}
                  onCancel={savedAddresses.length ? () => setAddingAddress(false) : undefined}
                />
              ) : (
                <>
                  <fieldset>
                    <legend className="sr-only">Choose a shipping address</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {savedAddresses.map((a) => (
                        <label
                          key={a.id}
                          className={cn(
                            'relative flex cursor-pointer gap-3 rounded-md border p-4 transition-colors',
                            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                            a.id === address?.id
                              ? 'border-ink bg-surface-muted'
                              : 'border-line-strong hover:border-ink',
                          )}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={a.id === address?.id}
                            onChange={() => setChosenAddressId(a.id)}
                            className="mt-1 size-4 accent-[var(--velo-ink)]"
                          />
                          <AddressLines address={a} />
                          {a.isDefault && <Badge className="absolute top-3 right-3">Default</Badge>}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAddingAddress(true)}
                      className="text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      + Add a new address
                    </button>
                    <Button onClick={() => setStep('review')} disabled={!address || cart.hasIssues}>
                      Continue to review
                    </Button>
                  </div>
                </>
              )}
            </StepCard>
          )}

          {/* 2. Review */}
          {step === 'review' && address && (
            <>
              <StepCard
                title="Shipping to"
                aside={
                  <button
                    type="button"
                    onClick={() => setStep('shipping')}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Change
                  </button>
                }
              >
                <AddressLines address={address} />
              </StepCard>
              <StepCard
                title={`Items (${cart.itemCount})`}
                aside={
                  <Link
                    to={paths.cart}
                    className="text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Edit bag
                  </Link>
                }
              >
                <OrderLineItems
                  lines={cart.items.map((l) => ({
                    id: l.id,
                    name: l.name,
                    colorway: l.colorway,
                    sizeLabel: l.sizeLabel,
                    quantity: l.quantity,
                    unitPricePaise: l.unitPricePaise,
                    lineTotalPaise: l.lineTotalPaise,
                    imageUrl: l.image?.url ?? null,
                    slug: l.slug,
                  }))}
                />
              </StepCard>
              <div className="flex justify-end">
                <Button size="lg" onClick={() => setStep('payment')} disabled={cart.hasIssues}>
                  Continue to payment
                </Button>
              </div>
            </>
          )}

          {/* 3. Payment (simulated) */}
          {step === 'payment' && address && (
            <StepCard title="Payment">
              <Alert tone="info" className="mb-6">
                This is a demo store. No real payment is taken and no card or UPI details are ever
                requested.
              </Alert>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Payment method</legend>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors',
                        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                        paymentMethod === m.value
                          ? 'border-ink bg-surface-muted'
                          : 'border-line-strong hover:border-ink',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.value}
                        checked={paymentMethod === m.value}
                        onChange={() => setPaymentMethod(m.value)}
                        className="mt-0.5 size-4 accent-[var(--velo-ink)]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{m.label}</span>
                        <span className="text-xs text-ink-muted">{m.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {paymentMethod !== 'COD' && (
                <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={simulateDecline}
                    onChange={(e) => setSimulateDecline(e.target.checked)}
                    className="size-4 accent-[var(--velo-ink)]"
                  />
                  Simulate a declined payment (demo)
                </label>
              )}

              {placeOrder.isError && !notice && (
                <Alert tone="danger" className="mt-5">
                  {errorMessage(placeOrder.error)}
                </Alert>
              )}

              <Button
                size="lg"
                fullWidth
                className="mt-6"
                loading={placeOrder.isPending}
                disabled={cart.hasIssues}
                onClick={handlePlaceOrder}
              >
                <Lock aria-hidden className="size-4" />
                Place order · {formatPrice(cart.totalPaise)}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
                <ShieldCheck aria-hidden className="size-3.5" />
                Your total is confirmed by our server before the order is placed.
              </p>
            </StepCard>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary cart={cart} />
        </aside>
      </div>
    </Container>
  );
}
