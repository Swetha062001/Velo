import { ArrowUpRight, RotateCcw, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { Price } from '../../components/product/Price.tsx';
import { ProductGrid, ProductGridSkeleton } from '../../components/product/ProductGrid.tsx';
import { ProductImage } from '../../components/product/ProductImage.tsx';
import { useCategories, useProducts } from '../../hooks/useCatalog.ts';
import { paths, productsUrl } from '../../routes/paths.ts';

const valueProps = [
  { icon: Truck, title: 'Free shipping from ₹2,999', text: 'Flat ₹99 on smaller orders.' },
  { icon: RotateCcw, title: '30-day returns', text: 'Unworn pairs, no questions asked.' },
  { icon: Sparkles, title: 'AI shopping assistant', text: 'Describe it — we find the pair.' },
];

const FEATURED_FILTERS = { featured: 'true', limit: '4' } as const;

function HeroFeature() {
  const featured = useProducts(FEATURED_FILTERS);
  const product = featured.data?.items[0];
  const image = product?.images[0];

  if (featured.isPending) {
    return (
      <Skeleton className="aspect-[4/3] w-full rounded-lg sm:aspect-[16/10] lg:aspect-[4/5]" />
    );
  }
  if (!product) return null;

  return (
    <Link
      to={paths.product(product.slug)}
      className="group relative block aspect-[4/3] overflow-hidden rounded-lg bg-inverse sm:aspect-[16/10] lg:aspect-[4/5]"
    >
      {image && (
        <ProductImage
          src={image.url}
          alt={image.alt}
          width={960}
          sizes="(min-width: 1024px) 40vw, 100vw"
          loading="eager"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-velo group-hover:scale-[1.03]"
        />
      )}
      {/* Scrim keeps the overlaid text legible on any photo. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
      />
      <span className="absolute top-5 left-5 rounded-xs bg-canvas px-2 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-ink uppercase">
        Featured
      </span>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
        <p className="font-display text-3xl font-extrabold [font-stretch:110%]">{product.name}</p>
        <p className="mt-1 text-sm text-white/80">{product.colorway}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <Price
            pricePaise={product.pricePaise}
            compareAtPricePaise={product.compareAtPricePaise}
            className="[&_*]:text-white"
          />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            Shop now
            <ArrowUpRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CategoryTiles() {
  const { data: categories, isPending } = useCategories();

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            key={i}
            className={`aspect-[3/4] w-full rounded-lg ${i === 0 ? 'col-span-2 aspect-[16/9] lg:col-span-1 lg:aspect-[3/4]' : ''}`}
          />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {categories?.map((c, i) => (
        <li key={c.slug} className={i === 0 ? 'col-span-2 lg:col-span-1' : undefined}>
          <Link
            to={productsUrl({ category: c.slug })}
            className={`group relative block overflow-hidden rounded-lg bg-surface-muted ${i === 0 ? 'aspect-[16/9] lg:aspect-[3/4]' : 'aspect-[3/4]'}`}
          >
            {c.imageUrl && (
              <ProductImage
                src={c.imageUrl}
                alt=""
                width={640}
                sizes="(min-width: 1024px) 20vw, 50vw"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-velo group-hover:scale-105"
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white">
              <span>
                <span className="block font-display text-xl font-extrabold">{c.name}</span>
                <span className="text-xs text-white/75">
                  {c.productCount} {c.productCount === 1 ? 'style' : 'styles'}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FeaturedProducts() {
  const featured = useProducts(FEATURED_FILTERS);
  if (featured.isPending) return <ProductGridSkeleton count={4} columns={4} />;
  if (!featured.data?.items.length) return null;
  return <ProductGrid products={featured.data.items} columns={4} />;
}

export default function HomePage() {
  return (
    <>
      <DocumentTitle />

      {/* Hero */}
      <section aria-labelledby="hero-heading" className="border-b border-line">
        <Container className="grid gap-12 py-16 sm:py-24 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
              Spring / Summer 2026
            </p>
            <h1
              id="hero-heading"
              className="mt-5 text-5xl leading-[0.92] font-extrabold [font-stretch:110%] sm:text-7xl xl:text-8xl"
            >
              Engineered
              <br />
              for motion.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-muted">
              Premium sneakers with considered materials and a minimal point of view. Built for the
              city, the track and everything between.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to={paths.products} size="lg">
                Shop the collection
              </ButtonLink>
              <ButtonLink to={productsUrl({ sort: 'newest' })} size="lg" variant="secondary">
                New arrivals
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroFeature />
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading">
        <Container className="py-16 sm:py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="categories-heading" className="text-3xl font-extrabold sm:text-4xl">
              Shop by category
            </h2>
            <Link
              to={paths.products}
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          <CategoryTiles />
        </Container>
      </section>

      {/* Featured */}
      <section aria-labelledby="featured-heading" className="border-t border-line">
        <Container className="py-16 sm:py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
                Editor&apos;s picks
              </p>
              <h2 id="featured-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Featured
              </h2>
            </div>
            <Link
              to={paths.products}
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              Shop all
            </Link>
          </div>
          <FeaturedProducts />
        </Container>
      </section>

      {/* Value props */}
      <section aria-label="Why VELO" className="border-y border-line bg-surface">
        <Container className="grid gap-8 py-12 sm:grid-cols-3">
          {valueProps.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm text-ink-muted">{text}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>
    </>
  );
}
