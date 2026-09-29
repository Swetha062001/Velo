import { Users } from 'lucide-react';
import {
  AdminPage,
  AdminSearch,
  FilterTabs,
  Table,
  Td,
  Th,
} from '../../components/admin/AdminUI.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { EmptyState } from '../../components/common/EmptyState.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Pagination } from '../../components/product/Pagination.tsx';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { useAdminMutation, useAdminUsers, useListParams } from '../../hooks/useAdmin.ts';
import { adminService } from '../../services/admin.service.ts';
import type { AdminUser } from '../../types/admin.ts';
import type { Role } from '../../types/user.ts';
import { cn } from '../../utils/cn.ts';
import { errorMessage } from '../../utils/forms.ts';
import { formatDate } from '../../utils/format.ts';
import { formatPrice } from '../../utils/money.ts';

function RoleSelect({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useAdminMutation((role: Role) => adminService.updateRole(user.id, role));
  return (
    <div>
      <label className="sr-only" htmlFor={`role-${user.id}`}>
        Role for {user.name}
      </label>
      <select
        id={`role-${user.id}`}
        value={user.role}
        disabled={isSelf || update.isPending}
        title={isSelf ? 'You can’t change your own role' : undefined}
        onChange={(e) => update.mutate(e.target.value as Role)}
        className="h-9 rounded-sm border border-line-strong bg-surface px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="USER">Customer</option>
        <option value="ADMIN">Admin</option>
      </select>
      {update.isError && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {errorMessage(update.error)}
        </p>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { data: me } = useCurrentUser();
  const { values, page, set } = useListParams(['q', 'role']);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminUsers({
    q: values.q,
    role: values.role,
    page,
    limit: 20,
  });

  return (
    <AdminPage title="Users" description="Role changes take effect immediately.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Role>
          label="Filter by role"
          options={[
            { value: undefined, label: 'All' },
            { value: 'USER', label: 'Customers' },
            { value: 'ADMIN', label: 'Admins' },
          ]}
          value={values.role as Role | undefined}
          onChange={(v) => set('role', v)}
        />
        <AdminSearch
          key={values.q ?? ''}
          value={values.q}
          onSearch={(q) => set('q', q)}
          placeholder="Search name or email"
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load users." onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try another search." />
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-50')}>
          <Table label="Users">
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Joined</Th>
                <Th className="text-right">Orders</Th>
                <Th className="text-right">Spent</Th>
                <Th>Role</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <span className="font-semibold">{u.name}</span>
                    {u.id === me?.id && <Badge className="ml-2">You</Badge>}
                    <span className="block text-xs text-ink-muted">{u.email}</span>
                  </Td>
                  <Td className="text-ink-muted">{formatDate(u.createdAt)}</Td>
                  <Td className="text-right tabular-nums">{u.orderCount}</Td>
                  <Td className="text-right tabular-nums">{formatPrice(u.totalSpentPaise)}</Td>
                  <Td>
                    <RoleSelect key={`${u.id}:${u.role}`} user={u} isSelf={u.id === me?.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-6">
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onChange={(p) => set('page', String(p))}
            />
          </div>
        </div>
      )}
    </AdminPage>
  );
}
