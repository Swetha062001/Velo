import { query, type Queryable } from '../../db/index.js';
import type { CreateAddressInput, UpdateAddressInput } from './addresses.schemas.js';

export interface AddressRow {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: Date;
}

const COLUMNS = `id, user_id, full_name, phone, line1, line2, city, state, postal_code, country,
                 is_default, created_at`;

/** camelCase input field → column name (allow-list: only these can be updated). */
const COLUMN_FOR: Record<keyof Omit<UpdateAddressInput, 'isDefault'>, string> = {
  fullName: 'full_name',
  phone: 'phone',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  state: 'state',
  postalCode: 'postal_code',
};

export const addressesRepository = {
  list(userId: string, db?: Queryable) {
    return query<AddressRow>(
      `SELECT ${COLUMNS} FROM addresses WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId],
      db,
    );
  },

  async findOwned(userId: string, id: string, db?: Queryable) {
    const rows = await query<AddressRow>(
      `SELECT ${COLUMNS} FROM addresses WHERE id = $1 AND user_id = $2`,
      [id, userId],
      db,
    );
    return rows[0] ?? null;
  },

  async count(userId: string, db?: Queryable) {
    const rows = await query<{ n: number }>(
      `SELECT count(*) AS n FROM addresses WHERE user_id = $1`,
      [userId],
      db,
    );
    return rows[0]!.n;
  },

  async create(userId: string, input: CreateAddressInput, isDefault: boolean, db?: Queryable) {
    const rows = await query<AddressRow>(
      `INSERT INTO addresses
         (user_id, full_name, phone, line1, line2, city, state, postal_code, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLUMNS}`,
      [
        userId,
        input.fullName,
        input.phone,
        input.line1,
        input.line2 ?? null,
        input.city,
        input.state,
        input.postalCode,
        isDefault,
      ],
      db,
    );
    return rows[0]!;
  },

  async update(userId: string, id: string, input: UpdateAddressInput, db?: Queryable) {
    const sets: string[] = [];
    const params: unknown[] = [id, userId];
    for (const [key, column] of Object.entries(COLUMN_FOR)) {
      const value = input[key as keyof typeof COLUMN_FOR];
      if (value !== undefined) {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.findOwned(userId, id, db);

    const rows = await query<AddressRow>(
      `UPDATE addresses SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      params,
      db,
    );
    return rows[0] ?? null;
  },

  /** Makes one address the default (clearing the old one first — a partial unique index allows one). */
  async setDefault(userId: string, id: string, db?: Queryable) {
    await query(
      `UPDATE addresses SET is_default = false WHERE user_id = $1 AND is_default`,
      [userId],
      db,
    );
    await query(
      `UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2`,
      [id, userId],
      db,
    );
  },

  async delete(userId: string, id: string, db?: Queryable) {
    const rows = await query<{ is_default: boolean }>(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING is_default`,
      [id, userId],
      db,
    );
    return rows[0] ?? null;
  },

  /** After deleting the default, promote the most recently added remaining address. */
  async promoteNewest(userId: string, db?: Queryable) {
    await query(
      `UPDATE addresses SET is_default = true
       WHERE id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
      [userId],
      db,
    );
  },
};
