import { query, type Queryable } from '../../db/index.js';
import type { UserRow } from './users.types.js';

const COLUMNS = 'id, name, email, password_hash, role, token_version, created_at, updated_at';

export const usersRepository = {
  async findByEmail(email: string, db?: Queryable) {
    const rows = await query<UserRow>(
      `SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email],
      db,
    );
    return rows[0] ?? null;
  },

  async findById(id: string, db?: Queryable) {
    const rows = await query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id], db);
    return rows[0] ?? null;
  },

  /** Always creates a USER — roles are never taken from client input. */
  async create(input: { name: string; email: string; passwordHash: string }, db?: Queryable) {
    const rows = await query<UserRow>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
      [input.name, input.email, input.passwordHash],
      db,
    );
    return rows[0]!;
  },

  async updateName(id: string, name: string, db?: Queryable) {
    const rows = await query<UserRow>(
      `UPDATE users SET name = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, name],
      db,
    );
    return rows[0] ?? null;
  },

  /** Sets a new hash and bumps token_version, which invalidates every existing session. */
  async updatePassword(id: string, passwordHash: string, db?: Queryable) {
    const rows = await query<UserRow>(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, passwordHash],
      db,
    );
    return rows[0] ?? null;
  },
};
