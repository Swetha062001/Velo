import { useState } from 'react';
import { formatPrice } from '../../utils/money.ts';

interface Point {
  day: string; // YYYY-MM-DD
  revenuePaise: number;
  orders: number;
}

const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const longFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const parseDay = (d: string) => new Date(`${d}T00:00:00`);

/** Rounds the axis maximum up to a clean number (e.g. ₹7,620 → ₹8,000). */
function niceMax(maxPaise: number) {
  if (maxPaise <= 0) return 100_000; // ₹1,000 so an empty chart still has a scale
  const rupees = maxPaise / 100;
  const magnitude = 10 ** Math.floor(Math.log10(rupees));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((n) => n >= rupees)!;
  return nice * 100;
}

/**
 * Single-series bar chart of daily revenue. Built from plain elements: one validated hue
 * (chart-1), 2px gaps, 4px rounded data-ends on the baseline, recessive gridlines, a
 * hover/focus tooltip per bar, and a screen-reader table with the same numbers.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.revenuePaise)));
  const ticks = [max, max / 2, 0];
  const point = active === null ? null : data[active];

  return (
    <figure>
      <div className="relative flex h-56 gap-3">
        {/* Y axis labels */}
        <div
          aria-hidden
          className="flex w-14 flex-col justify-between pb-6 text-right text-[0.7rem] text-ink-subtle tabular-nums"
        >
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatPrice(t)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Gridlines */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between"
          >
            {ticks.map((t) => (
              <span key={t} className="block h-px w-full bg-line" />
            ))}
          </div>

          {/* Bars — each column is a full-height hit target */}
          <div
            className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[2px]"
            onMouseLeave={() => setActive(null)}
          >
            {data.map((d, i) => {
              const height = (d.revenuePaise / max) * 100;
              return (
                <button
                  key={d.day}
                  type="button"
                  aria-label={`${longFormat.format(parseDay(d.day))}: ${formatPrice(d.revenuePaise)} from ${d.orders} ${d.orders === 1 ? 'order' : 'orders'}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group flex h-full flex-1 items-end focus-visible:outline-offset-0"
                >
                  <span
                    className="block w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
                    style={{ height: d.revenuePaise > 0 ? `max(${height}%, 3px)` : '0' }}
                  />
                </button>
              );
            })}
          </div>

          {/* X axis labels (every other day to avoid collisions) */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 flex gap-[2px] text-[0.65rem] text-ink-subtle"
          >
            {data.map((d, i) => (
              <span key={d.day} className="flex-1 truncate text-center">
                {i % 2 === data.length % 2 ? dayFormat.format(parseDay(d.day)) : ''}
              </span>
            ))}
          </div>

          {/* Tooltip — text uses ink tokens, not the series colour */}
          {point && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute -top-2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
              style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold">{longFormat.format(parseDay(point.day))}</p>
              <p className="mt-0.5 text-ink-muted">
                <span className="font-semibold text-ink tabular-nums">
                  {formatPrice(point.revenuePaise)}
                </span>
                {' · '}
                {point.orders} {point.orders === 1 ? 'order' : 'orders'}
              </p>
            </div>
          )}
        </div>
      </div>

      <table className="sr-only">
        <caption>Revenue by day, last {data.length} days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{longFormat.format(parseDay(d.day))}</td>
              <td>{formatPrice(d.revenuePaise)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
