import { z } from 'zod';
import { query } from '../../../db/index.js';
import { AppError } from '../../../utils/AppError.js';
import { paginationMeta, paginationQuerySchema, toOffset } from '../../../utils/pagination.js';

/* ── Schemas ─────────────────────────────────────────────────────────────── */

export const listAdminUsersQuerySchema = paginationQuerySchema.extend({
  q: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(100).optional()),
  role: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['USER', 'ADMIN']).optional()),
});

export const updateRoleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });

export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

/* ── Service ─────────────────────────────────────────────────────────────── */

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  created_at: Date;
  order_count: number;
  total_spent_paise: number;
  total_count: number;
}

const SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.created_at,
         count(o.id) FILTER (WHERE o.status <> 'CANCELLED') AS order_count,
         COALESCE(sum(o.total_paise) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS total_spent_paise`;

const toDto = (u: Omit<AdminUserRow, 'total_count'>) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.created_at.toISOString(),
  orderCount: u.order_count,
  totalSpentPaise: u.total_spent_paise,
});

export const adminUsersService = {
  async list(q: ListAdminUsersQuery) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (q.role) {
      params.push(q.role);
      where.push(`u.role = $${params.length}`);
    }
    params.push(q.limit, toOffset(q));

    const rows = await query<AdminUserRow>(
      `${SELECT}, count(*) OVER () AS total_count
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(toDto), meta: paginationMeta(q, rows[0]?.total_count ?? 0) };
  },

  /**
   * Admins can't change their own role — this also guarantees at least one admin remains.
   * The new role applies immediately: roles are re-read from the database on every request.
   */
  async updateRole(actingUserId: string, userId: string, role: 'USER' | 'ADMIN') {
    if (actingUserId === userId) {
      throw new AppError(409, 'CANNOT_CHANGE_OWN_ROLE', 'You can’t change your own role');
    }
    const updated = await query<{ id: string }>(
      `UPDATE users SET role = $2 WHERE id = $1 RETURNING id`,
      [userId, role],
    );
    if (!updated[0]) throw AppError.notFound('User not found');

    const [row] = await query<Omit<AdminUserRow, 'total_count'>>(
      `${SELECT} FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.id = $1 GROUP BY u.id`,
      [userId],
    );
    return toDto(row!);
  },
};
