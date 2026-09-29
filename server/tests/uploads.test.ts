import { existsSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/index.js';
import { DEV_ACCOUNTS, seed } from '../src/db/seed.js';
import { LocalDiskStorage } from '../src/storage/LocalDiskStorage.js';
import { localStorage } from '../src/storage/index.js';
import { detectImageType } from '../src/utils/imageType.js';
import { truncateAll } from './helpers/db.js';
import { signedInShopper } from './helpers/users.js';

const app = createApp();
const url = '/api/v1/admin/uploads/images';

/** A valid 1×1 PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

let admin: request.Agent;

const filePath = (fileUrl: string) =>
  path.join(localStorage.rootDir, localStorage.keyFromUrl(fileUrl)!);

async function upload(file: Buffer, filename = 'shoe.png') {
  return admin.post(url).attach('file', file, filename);
}

beforeAll(async () => {
  await truncateAll();
  await seed(pool);
  admin = request.agent(app);
  await admin
    .post('/api/v1/auth/login')
    .send({ email: DEV_ACCOUNTS.admin.email, password: DEV_ACCOUNTS.admin.password })
    .expect(200);
});

describe('POST /admin/uploads/images', () => {
  it('requires an admin', async () => {
    expect((await request(app).post(url).attach('file', PNG, 'a.png')).status).toBe(401);
    const customer = await signedInShopper(app);
    expect((await customer.post(url).attach('file', PNG, 'a.png')).status).toBe(403);
  });

  it('stores a valid image under a random name and serves it cross-origin', async () => {
    const res = await upload(PNG, '../../evil name.png');
    expect(res.status).toBe(201);
    expect(res.body.data.contentType).toBe('image/png');
    expect(res.body.data.url).toMatch(/\/uploads\/products\/[0-9a-f-]{36}\.png$/);
    expect(res.body.data.url).not.toContain('evil');
    expect(existsSync(filePath(res.body.data.url))).toBe(true);

    const servedPath = new URL(res.body.data.url).pathname;
    const served = await request(app).get(servedPath);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.headers['cache-control']).toContain('immutable');
  });

  it('identifies the type from the bytes, not the filename', async () => {
    const res = await upload(JPEG_HEADER, 'photo.png');
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/\.jpg$/);
  });

  it('rejects files that are not JPEG/PNG/WebP, whatever their name', async () => {
    const res = await upload(Buffer.from('<script>alert(1)</script>'), 'innocent.png');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('rejects images over 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await upload(big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('requires a file in the "file" field', async () => {
    expect((await admin.post(url)).status).toBe(400);
    expect((await admin.post(url).attach('photo', PNG, 'a.png')).status).toBe(400);
  });

  it('does not serve anything outside the upload folder', async () => {
    expect((await request(app).get('/uploads/../package.json')).status).toBe(404);
    expect((await request(app).get('/uploads/%2e%2e/package.json')).status).toBeGreaterThanOrEqual(
      400,
    );
  });
});

describe('using uploads on products', () => {
  it('accepts uploaded URLs, rejects other http URLs, and deletes files when removed', async () => {
    const product = (await pool.query(`SELECT id FROM products WHERE status = 'DRAFT' LIMIT 1`))
      .rows[0];
    const first = (await upload(PNG)).body.data.url as string;
    const second = (await upload(PNG)).body.data.url as string;

    const bad = await admin
      .put(`/api/v1/admin/products/${product.id}/images`)
      .send({ images: [{ url: 'http://example.com/x.png', altText: 'x' }] });
    expect(bad.status).toBe(400);

    const saved = await admin.put(`/api/v1/admin/products/${product.id}/images`).send({
      images: [
        { url: first, altText: 'First' },
        { url: second, altText: 'Second' },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.images.map((i: { url: string }) => i.url)).toEqual([first, second]);

    // Remove the first image → its file is deleted; the second stays.
    await admin
      .put(`/api/v1/admin/products/${product.id}/images`)
      .send({ images: [{ url: second, altText: 'Second' }] })
      .expect(200);
    expect(existsSync(filePath(first))).toBe(false);
    expect(existsSync(filePath(second))).toBe(true);

    // Deleting the (never-ordered) product removes its remaining files.
    await admin.delete(`/api/v1/admin/products/${product.id}`).expect(204);
    expect(existsSync(filePath(second))).toBe(false);
  });

  it('keeps a file that is still used by another product', async () => {
    const [a, b] = (
      await pool.query(`SELECT id FROM products WHERE status = 'ACTIVE' ORDER BY slug LIMIT 2`)
    ).rows;
    const shared = (await upload(PNG)).body.data.url as string;
    for (const p of [a, b]) {
      await admin
        .put(`/api/v1/admin/products/${p.id}/images`)
        .send({ images: [{ url: shared, altText: 'Shared' }] })
        .expect(200);
    }
    await admin
      .put(`/api/v1/admin/products/${a.id}/images`)
      .send({ images: [{ url: 'https://images.unsplash.com/photo-x', altText: 'Other' }] })
      .expect(200);
    expect(existsSync(filePath(shared))).toBe(true);
  });
});

describe('storage + type detection units', () => {
  const disk = new LocalDiskStorage('/tmp/velo-unit', 'http://localhost:5001');

  it('only recognises its own well-formed URLs', () => {
    expect(
      disk.keyFromUrl(
        'http://localhost:5001/uploads/products/5b4a2c3e-8f1d-4e6a-9c7b-2d3e4f5a6b7c.png',
      ),
    ).toBe('products/5b4a2c3e-8f1d-4e6a-9c7b-2d3e4f5a6b7c.png');
    expect(disk.keyFromUrl('http://localhost:5001/uploads/../etc/passwd')).toBeNull();
    expect(disk.keyFromUrl('https://evil.example/uploads/products/x.png')).toBeNull();
  });

  it('refuses to delete keys outside the pattern', async () => {
    await expect(disk.delete('../../etc/passwd')).rejects.toThrow(/Invalid storage key/);
  });

  it('detects JPEG, PNG and WebP by magic bytes', () => {
    expect(detectImageType(PNG)?.extension).toBe('png');
    expect(detectImageType(JPEG_HEADER)?.extension).toBe('jpg');
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    expect(detectImageType(webp)?.extension).toBe('webp');
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
  });
});
