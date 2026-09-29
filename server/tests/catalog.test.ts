import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { seed } from '../src/db/seed.js';
import { stockStatus, toPrefixTsQuery } from '../src/modules/products/products.service.js';
import { truncateAll } from './helpers/db.js';

const app = createApp();
const api = '/api/v1';

interface Summary {
  slug: string;
  name: string;
  color: string;
  gender: string;
  pricePaise: number;
  category: { slug: string };
  images: Array<{ url: string; alt: string }>;
}

async function list(query = '') {
  const res = await request(app).get(`${api}/products${query}`);
  expect(res.status).toBe(200);
  return res.body as { data: Summary[]; meta: Record<string, unknown> };
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
});

describe('GET /products', () => {
  it('lists only active products, paginated, with images and money in paise', async () => {
    const { data, meta } = await list('?limit=5');
    expect(meta).toMatchObject({ page: 1, limit: 5, total: 19, totalPages: 4, sort: 'featured' });
    expect(data).toHaveLength(5);
    expect(data.map((p) => p.slug)).not.toContain('velo-cove-sandal-desert-tan'); // draft
    expect(Number.isInteger(data[0]!.pricePaise)).toBe(true);
    expect(data[0]!.images.length).toBeGreaterThanOrEqual(1);
    expect(data[0]!.images[0]!.alt).toMatch(/VELO/);
  });

  it('returns the last page and an empty page past the end', async () => {
    expect((await list('?limit=5&page=4')).data).toHaveLength(4);
    const beyond = await list('?limit=5&page=9');
    expect(beyond.data).toHaveLength(0);
    expect(beyond.meta.total).toBe(19);
  });

  it('filters by category', async () => {
    const { data } = await list('?category=running');
    expect(data.length).toBe(5);
    expect(data.every((p) => p.category.slug === 'running')).toBe(true);
  });

  it('includes unisex styles in the men / women filters', async () => {
    const { data } = await list('?gender=women&limit=48');
    expect(new Set(data.map((p) => p.gender))).toEqual(new Set(['WOMEN', 'UNISEX']));
  });

  it('filters by colours (comma-separated) and price range in rupees', async () => {
    const { data } = await list('?color=white,black&minPrice=3000&maxPrice=5000&limit=48');
    expect(data.length).toBeGreaterThan(0);
    for (const p of data) {
      expect(['white', 'black']).toContain(p.color);
      expect(p.pricePaise).toBeGreaterThanOrEqual(300000);
      expect(p.pricePaise).toBeLessThanOrEqual(500000);
    }
  });

  it('size filter only matches products in stock in that size', async () => {
    const { rows } = await pool.query<{ slug: string }>(`
      SELECT p.slug FROM products p
      JOIN product_variants v ON v.product_id = p.id AND v.size_label = 'UK 9'
      JOIN inventory i ON i.variant_id = v.id
      WHERE p.status = 'ACTIVE' AND i.quantity = 0`);
    const { data } = await list('?size=9&limit=48');
    const slugs = data.map((p) => p.slug);
    for (const soldOut of rows) expect(slugs).not.toContain(soldOut.slug);
    expect(slugs.length).toBeGreaterThan(0);
  });

  it('supports the spec example URL', async () => {
    const { data } = await list('?category=running&maxPrice=6000&size=9&sort=price-low');
    expect(data.length).toBeGreaterThan(0);
    const prices = data.map((p) => p.pricePaise);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('sorts by price both ways', async () => {
    const low = (await list('?sort=price-low&limit=48')).data.map((p) => p.pricePaise);
    const high = (await list('?sort=price-high&limit=48')).data.map((p) => p.pricePaise);
    expect(low).toEqual([...low].sort((a, b) => a - b));
    expect(high).toEqual([...high].sort((a, b) => b - a));
  });

  it('searches with prefixes across name, colourway, material and tags', async () => {
    expect((await list('?q=aer')).data.map((p) => p.name)).toEqual(
      expect.arrayContaining(['VELO Aero One']),
    );
    expect((await list('?q=leather')).data.map((p) => p.slug)).toContain(
      'velo-street-core-chalk-white',
    );
    // "everyday" is a tag, not in the name
    expect((await list('?q=white%20everyday&maxPrice=5000')).data.map((p) => p.slug)).toEqual(
      expect.arrayContaining(['velo-street-core-chalk-white', 'velo-motion-02-cloud-white']),
    );
    expect((await list('?q=aero')).meta.sort).toBe('relevance');
  });

  it('treats search input as data, not SQL or tsquery syntax', async () => {
    for (const q of ["'; DROP TABLE products; --", 'aero & | ! ( ) :*', '%27%20OR%201=1']) {
      const res = await request(app).get(`${api}/products`).query({ q });
      expect(res.status).toBe(200);
    }
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM products');
    expect(rows[0].n).toBe(20);
  });

  it('ignores empty filter params', async () => {
    expect((await list('?q=&category=&color=&sort=')).meta.total).toBe(19);
  });

  it('rejects invalid filters with field details', async () => {
    const res = await request(app).get(
      `${api}/products?limit=500&sort=cheap&minPrice=9000&maxPrice=1000&size=nine`,
    );
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['query.limit', 'query.sort', 'query.size.0']));
  });
});

describe('GET /products/:slug', () => {
  it('returns full detail with variants, stock status, colourways and related', async () => {
    const res = await request(app).get(`${api}/products/velo-pulse-runner-triple-white`);
    expect(res.status).toBe(200);
    const p = res.body.data;

    expect(p).toMatchObject({ name: 'VELO Pulse Runner', colorway: 'Triple White', brand: 'VELO' });
    expect(p.images.length).toBeGreaterThanOrEqual(2);
    expect(p.variants).toHaveLength(6);
    expect(p.variants[0]).toEqual({
      id: expect.any(String),
      sizeLabel: 'UK 6',
      sku: 'VELO-PLSR-WHT-06',
      pricePaise: 549900,
      stockStatus: expect.stringMatching(/in_stock|low_stock|out_of_stock/),
    });
    expect(JSON.stringify(p)).not.toMatch(/quantity|low_stock_threshold/); // no raw stock counts
    expect(p.colorways.map((c: { slug: string }) => c.slug)).toEqual([
      'velo-pulse-runner-midnight-black',
    ]);
    expect(p.related.length).toBeGreaterThan(0);
    expect(p.related.every((r: Summary) => r.name !== 'VELO Pulse Runner')).toBe(true);
  });

  it('hides draft products and unknown slugs', async () => {
    expect((await request(app).get(`${api}/products/velo-cove-sandal-desert-tan`)).status).toBe(
      404,
    );
    expect((await request(app).get(`${api}/products/does-not-exist`)).status).toBe(404);
    expect((await request(app).get(`${api}/products/Bad_Slug!`)).status).toBe(400);
  });
});

describe('GET /products/facets and /categories', () => {
  it('returns filter facets for visible products', async () => {
    const res = await request(app).get(`${api}/products/facets`);
    expect(res.status).toBe(200);
    const f = res.body.data;
    expect(f.sizes[0]).toBe('UK 3');
    expect(f.sizes.at(-1)).toBe('UK 11');
    expect(f.colors.find((c: { value: string }) => c.value === 'white').count).toBe(5);
    expect(f.priceRange).toEqual({ minPaise: 149900, maxPaise: 949900 });
  });

  it('lists categories with active product counts', async () => {
    const res = await request(app).get(`${api}/categories`);
    expect(res.status).toBe(200);
    const slides = res.body.data.find((c: { slug: string }) => c.slug === 'slides');
    expect(slides).toMatchObject({ name: 'Slides & Sandals', productCount: 2 }); // draft excluded
    expect(slides.imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it('GET /categories/:slug returns one category or 404', async () => {
    expect((await request(app).get(`${api}/categories/running`)).body.data.productCount).toBe(5);
    expect((await request(app).get(`${api}/categories/hiking`)).status).toBe(404);
  });
});

describe('helpers', () => {
  it('toPrefixTsQuery strips operators and builds prefix terms', () => {
    expect(toPrefixTsQuery('Aero One')).toBe('aero:* & one:*');
    expect(toPrefixTsQuery("x' | !y & (z)")).toBe('x:* & y:* & z:*');
    expect(toPrefixTsQuery('  !!  ')).toBeUndefined();
  });

  it('stockStatus maps quantity to a public status', () => {
    const base = { is_active: true, low_stock_threshold: 5 };
    expect(stockStatus({ ...base, quantity: 0 })).toBe('out_of_stock');
    expect(stockStatus({ ...base, quantity: 3 })).toBe('low_stock');
    expect(stockStatus({ ...base, quantity: 20 })).toBe('in_stock');
    expect(stockStatus({ ...base, is_active: false, quantity: 20 })).toBe('out_of_stock');
  });
});
