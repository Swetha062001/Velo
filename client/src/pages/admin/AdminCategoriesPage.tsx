import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AdminPage, Panel, Table, Td, Th } from '../../components/admin/AdminUI.tsx';
import { ImageDropzone } from '../../components/admin/ImageDropzone.tsx';
import { ProductImage } from '../../components/product/ProductImage.tsx';
import { Alert } from '../../components/common/Alert.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { Button } from '../../components/common/Button.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { Textarea } from '../../components/common/Textarea.tsx';
import { useAdminCategories, useAdminMutation } from '../../hooks/useAdmin.ts';
import { adminService } from '../../services/admin.service.ts';
import type { AdminCategory } from '../../types/admin.ts';
import { errorMessage } from '../../utils/forms.ts';

function CategoryForm({ category, onDone }: { category?: AdminCategory; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const save = useAdminMutation(
    (input: Partial<AdminCategory>) =>
      category
        ? adminService.updateCategory(category.id, input)
        : adminService.createCategory(input),
    { onSuccess: onDone },
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate({
      name: name.trim(),
      ...(slug.trim() && { slug: slug.trim() }),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      sortOrder: Number(sortOrder) || 0,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Slug (optional)"
          placeholder="auto from name"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Input
          label="Sort order"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="aspect-[3/4] overflow-hidden rounded-md bg-surface-muted">
          {imageUrl && (
            <ProductImage src={imageUrl} alt="" width={240} className="size-full object-cover" />
          )}
        </div>
        <div className="space-y-3">
          <ImageDropzone
            compact
            multiple={false}
            maxFiles={1}
            folder="categories"
            onUploaded={(url) => setImageUrl(url)}
          />
          <Input
            label="Cover image URL (optional)"
            placeholder="https://… or upload above"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>
      </div>
      <Textarea
        label="Description (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-3">
        <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
          {category ? 'Save category' : 'Create category'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CategoryRow({ category, onEdit }: { category: AdminCategory; onEdit: () => void }) {
  const toggle = useAdminMutation(() =>
    adminService.updateCategory(category.id, { isActive: !category.isActive }),
  );
  const remove = useAdminMutation(() => adminService.deleteCategory(category.id));
  const error = toggle.error ?? remove.error;

  return (
    <>
      <tr>
        <Td>
          <p className="font-semibold">{category.name}</p>
          <p className="text-xs text-ink-muted">/{category.slug}</p>
        </Td>
        <Td className="tabular-nums">{category.productCount}</Td>
        <Td className="tabular-nums">{category.sortOrder}</Td>
        <Td>{category.isActive ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}</Td>
        <Td className="whitespace-nowrap text-right">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={toggle.isPending}
            onClick={() => toggle.mutate(undefined)}
          >
            {category.isActive ? 'Hide' : 'Show'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={remove.isPending}
            disabled={category.productCount > 0}
            title={category.productCount > 0 ? 'Only empty categories can be deleted' : undefined}
            onClick={() => remove.mutate(undefined)}
          >
            Delete
          </Button>
        </Td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5} role="alert" className="px-4 pb-3 text-xs font-medium text-danger">
            {errorMessage(error)}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminCategoriesPage() {
  const { data, isPending, isError, refetch } = useAdminCategories();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const current = data?.find((c) => c.id === editing);

  return (
    <AdminPage
      title="Categories"
      description="Hidden categories (and their products) don’t appear in the store."
      actions={
        editing === null && (
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden className="size-4" /> New category
          </Button>
        )
      }
    >
      {editing !== null && (
        <Panel
          title={editing === 'new' ? 'New category' : `Edit ${current?.name ?? ''}`}
          className="mb-6"
        >
          <CategoryForm key={editing} category={current} onDone={() => setEditing(null)} />
        </Panel>
      )}

      {isPending ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : isError ? (
        <ErrorState message="We couldn't load categories." onRetry={() => refetch()} />
      ) : (
        <Table label="Categories">
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Products</Th>
              <Th>Order</Th>
              <Th>Status</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <CategoryRow key={c.id} category={c} onEdit={() => setEditing(c.id)} />
            ))}
          </tbody>
        </Table>
      )}
    </AdminPage>
  );
}
