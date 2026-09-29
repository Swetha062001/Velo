import { ChevronDown, PackageSearch, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/common/Alert.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button, ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { Price } from '../../components/product/Price.tsx';
import { ProductGallery } from '../../components/product/ProductGallery.tsx';
import { ProductGrid } from '../../components/product/ProductGrid.tsx';
import { ProductImage } from '../../components/product/ProductImage.tsx';
import { SizeSelector } from '../../components/product/SizeSelector.tsx';
import { WishlistButton } from '../../components/wishlist/WishlistButton.tsx';
import { useAddToCart } from '../../hooks/useCart.ts';
import { useProduct } from '../../hooks/useCatalog.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { paths, productsUrl } from '../../routes/paths.ts';
import { useUi } from '../../store/ui.ts';
import type { ProductDetail } from '../../types/catalog.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';

const GENDER_LABEL = { MEN: 'Men', WOMEN: 'Women', UNISEX: 'Unisex' } as const;

function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-6 text-sm leading-relaxed text-ink-muted">{children}</div>
    </details>
  );
}

function ProductSkeleton() {
  return (
    <Container className="grid gap-10 py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <Skeleton className="aspect-[4/5] w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-8 h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </Container>
  );
}

function PurchasePanel({ product }: { product: ProductDetail }) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string>();
  const addToCart = useAddToCart();
  const openCartDrawer = useUi((s) => s.openCartDrawer);

  const soldOut = !product.inStock;

  function handleAdd() {
    if (!variantId) {
      setSizeError('Please select a size.');
      return;
    }
    setSizeError(undefined);
    addToCart.mutate({ variantId, quantity: 1 }, { onSuccess: openCartDrawer });
  }

  return (
    <div className="space-y-6">
      <SizeSelector
        variants={product.variants}
        selectedId={variantId}
        onSelect={(id) => {
          setVariantId(id);
          setSizeError(undefined);
          addToCart.reset();
        }}
        error={sizeError}
      />

      <div className="flex gap-3">
        <Button
          size="lg"
          fullWidth
          disabled={soldOut}
          loading={addToCart.isPending}
          onClick={handleAdd}
        >
          {soldOut ? 'Sold out' : 'Add to bag'}
        </Button>
        <WishlistButton product={product} variant="inline" />
      </div>

      {addToCart.isError && <Alert tone="danger">{errorMessage(addToCart.error)}</Alert>}
    </div>
  );
}

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, isPending, isError, error, refetch } = useProduct(slug);

  if (isPending) return <ProductSkeleton />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Container className="py-16">
          <DocumentTitle title="Product not found" />
          <EmptyState
            icon={PackageSearch}
            title="We couldn't find that product"
            description="It may have sold out or the link may be wrong."
            action={<ButtonLink to={paths.products}>Browse all products</ButtonLink>}
          />
        </Container>
      );
    }
    return (
      <Container className="py-16">
        <ErrorState message="We couldn't load this product." onRetry={() => refetch()} />
      </Container>
    );
  }

  return (
    <>
      <DocumentTitle title={`${product.name} — ${product.colorway}`} />

      <Container className="pt-6 pb-16 sm:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to={paths.products} className="hover:text-ink">
                Shop
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                to={productsUrl({ category: product.category.slug })}
                className="hover:text-ink"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
              {product.category.name} · {GENDER_LABEL[product.gender]}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold [font-stretch:105%] sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-2 text-lg text-ink-muted">{product.colorway}</p>

            <div className="mt-5 flex items-center gap-3">
              <Price
                pricePaise={product.pricePaise}
                compareAtPricePaise={product.compareAtPricePaise}
                size="lg"
              />
              {!product.inStock && <Badge>Sold out</Badge>}
            </div>
            <p className="mt-1 text-xs text-ink-subtle">Inclusive of all taxes</p>

            {product.colorways.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-semibold">
                  Colourway: <span className="font-normal text-ink-muted">{product.colorway}</span>
                </p>
                <ul className="flex gap-3">
                  <li>
                    <span
                      aria-current="true"
                      className="block overflow-hidden rounded-md border-2 border-ink"
                      title={product.colorway}
                    >
                      {product.images[0] && (
                        <ProductImage
                          src={product.images[0].url}
                          alt={product.colorway}
                          width={160}
                          className="size-16 object-cover"
                        />
                      )}
                    </span>
                  </li>
                  {product.colorways.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to={paths.product(c.slug)}
                        title={c.colorway}
                        aria-label={`${product.name} in ${c.colorway}`}
                        className="block overflow-hidden rounded-md border-2 border-transparent hover:border-line-strong"
                      >
                        {c.image ? (
                          <ProductImage
                            src={c.image.url}
                            alt=""
                            width={160}
                            className="size-16 object-cover"
                          />
                        ) : (
                          <span className="block size-16 bg-surface-muted" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8">
              {/* Remount per product so selection resets when switching colourways. */}
              <PurchasePanel key={product.id} product={product} />
            </div>

            <ul className="mt-8 grid gap-3 border-y border-line py-6 text-sm">
              {[
                { icon: Truck, text: 'Free shipping on orders of ₹2,999 or more' },
                { icon: RotateCcw, text: '30-day returns on unworn pairs' },
                { icon: ShieldCheck, text: 'Secure checkout' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-ink-muted">
                  <Icon aria-hidden className="size-4 text-ink" strokeWidth={1.75} />
                  {text}
                </li>
              ))}
            </ul>

            <div>
              <Disclosure title="Description" defaultOpen>
                <p>{product.description}</p>
              </Disclosure>
              <Disclosure title="Materials & care">
                {product.material && <p>{product.material}.</p>}
                <p className="mt-2">
                  Wipe clean with a soft, damp cloth. Air dry away from direct heat.
                </p>
              </Disclosure>
              <Disclosure title="Shipping & returns">
                <p>
                  Orders of ₹2,999 or more ship free; otherwise a flat ₹99. Unworn pairs can be
                  returned within 30 days.
                </p>
              </Disclosure>
            </div>
          </div>
        </div>
      </Container>

      {product.related.length > 0 && (
        <section aria-labelledby="related-heading" className="border-t border-line">
          <Container className="py-16">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-3xl font-extrabold">
                You may also like
              </h2>
              <Link
                to={productsUrl({ category: product.category.slug })}
                className={cn('text-sm font-semibold underline-offset-4 hover:underline')}
              >
                More {product.category.name.toLowerCase()}
              </Link>
            </div>
            <ProductGrid products={product.related} columns={4} />
          </Container>
        </section>
      )}
    </>
  );
}
