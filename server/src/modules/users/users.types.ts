export type Role = 'USER' | 'ADMIN';

/** A row of the users table. Contains the password hash — never send it to a client. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  token_version: number;
  created_at: Date;
  updated_at: Date;
}

/** The signed-in user attached to `req.user` (no password hash). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tokenVersion: number;
  createdAt: Date;
}

/** The shape returned by the API. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    tokenVersion: row.token_version,
    createdAt: row.created_at,
  };
}

export function toPublicUser(user: UserRow | AuthUser): PublicUser {
  const createdAt = 'created_at' in user ? user.created_at : user.createdAt;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: createdAt.toISOString(),
  };
}
