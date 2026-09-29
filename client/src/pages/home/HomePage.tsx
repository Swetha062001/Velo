import { ArrowUpRight, RotateCcw, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/common/Button.tsx';
import { DocumentTitle } from '../../components/common/DocumentTitle.tsx';
import { Container } from '../../components/layout/Container.tsx';
import { paths, productsUrl } from '../../routes/paths.ts';

// Slugs match the categories seeded in Phase 4. Product imagery arrives in Phase 6.
const categories = [
  { name: 'Running', slug: 'running', blurb: 'Responsive cushioning for daily miles.' },
  { name: 'Lifestyle', slug: 'lifestyle', blurb: 'Clean silhouettes for every day.' },
  { name: 'Training', slug: 'training', blurb: 'Stable platforms for the gym floor.' },
  { name: 'Basketball', slug: 'basketball', blurb: 'Support and grip on the court.' },
];

const valueProps = [
  { icon: Truck, title: 'Free shipping over ₹2,999', text: 'Flat ₹99 on smaller orders.' },
  { icon: RotateCcw, title: '30-day returns', text: 'Unworn pairs, no questions asked.' },
  { icon: Sparkles, title: 'AI shopping assistant', text: 'Describe it — we find the pair.' },
];

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
              <ButtonLink to={productsUrl({ category: 'running' })} size="lg" variant="secondary">
                Explore running
              </ButtonLink>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative flex aspect-[4/3] flex-col sm:aspect-[16/10] lg:aspect-[4/5] justify-between overflow-hidden rounded-lg bg-inverse p-6 text-inverse-fg sm:p-8">
              <span className="text-xs font-semibold tracking-[0.2em] text-inverse-fg/60 uppercase">
                Featured
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 bottom-16 font-display text-[12rem] leading-none font-black text-inverse-fg/[0.06] [font-stretch:125%] sm:text-[16rem]"
              >
                01
              </span>
              <div className="relative">
                <p className="font-display text-3xl font-extrabold [font-stretch:110%]">
                  VELO Aero One
                </p>
                <p className="mt-2 text-sm text-inverse-fg/70">
                  Lightweight knit upper. Featherlight foam. Everyday speed.
                </p>
                <Link
                  to={productsUrl({ q: 'aero one' })}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-inverse-fg underline-offset-4 hover:underline"
                >
                  Discover
                  <ArrowUpRight aria-hidden className="size-4 text-accent" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading">
        <Container className="py-16 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 id="categories-heading" className="text-3xl font-extrabold sm:text-4xl">
              Shop by category
            </h2>
            <Link
              to={paths.products}
              className="hidden text-sm font-semibold underline-offset-4 hover:underline sm:inline"
            >
              View all
            </Link>
          </div>

          <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <li key={c.slug} className="bg-surface">
                <Link
                  to={productsUrl({ category: c.slug })}
                  className="group flex h-full min-h-56 flex-col justify-between p-6 transition-colors hover:bg-surface-muted"
                >
                  <span className="text-xs font-semibold text-ink-subtle tabular-nums">
                    0{i + 1}
                  </span>
                  <span>
                    <span className="flex items-center justify-between font-display text-2xl font-extrabold">
                      {c.name}
                      <ArrowUpRight
                        aria-hidden
                        className="size-5 text-ink-muted transition-transform duration-200 ease-velo group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                      />
                    </span>
                    <span className="mt-2 block text-sm text-ink-muted">{c.blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
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
