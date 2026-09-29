import { paths, productsUrl } from '../../routes/paths.ts';
import type { AssistantReply } from '../../types/assistant.ts';
import { formatRupees } from '../../utils/money.ts';

/** Filter chips + a catalogue URL for the filters the answer actually used. */
export function effectiveFilters({ appliedFilters: f, relaxed }: AssistantReply) {
  const chips: string[] = [];
  const query: Record<string, string> = {};
  if (f.category && !relaxed.includes('category')) {
    chips.push(f.category);
    query.category = f.category;
  }
  if (f.gender && !relaxed.includes('gender')) {
    chips.push(f.gender);
    query.gender = f.gender;
  }
  if (f.colors.length && !relaxed.includes('colour')) {
    chips.push(...f.colors);
    query.color = f.colors.join(',');
  }
  if (f.size && !relaxed.includes('size')) {
    chips.push(`UK ${f.size}`);
    query.size = f.size;
  }
  if (!relaxed.includes('price')) {
    if (f.minPriceInr !== null && f.maxPriceInr !== null) {
      chips.push(`${formatRupees(f.minPriceInr)}–${formatRupees(f.maxPriceInr)}`);
    } else if (f.maxPriceInr !== null) chips.push(`under ${formatRupees(f.maxPriceInr)}`);
    else if (f.minPriceInr !== null) chips.push(`from ${formatRupees(f.minPriceInr)}`);
    if (f.minPriceInr !== null) query.minPrice = String(f.minPriceInr);
    if (f.maxPriceInr !== null) query.maxPrice = String(f.maxPriceInr);
  }
  return { chips, url: Object.keys(query).length ? productsUrl(query) : paths.products };
}
