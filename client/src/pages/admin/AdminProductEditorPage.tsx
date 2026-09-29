import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { AdminPage, Panel, ProductStatusBadge } from '../../components/admin/AdminUI.tsx';
import { ImagesEditor } from '../../components/admin/product/ImagesEditor.tsx';
import { ProductDetailsFields } from '../../components/admin/product/ProductDetailsFields.tsx';
import { SizesEditor } from '../../components/admin/product/SizesEditor.tsx';
import { Alert } from '../../components/common/Alert.tsx';
import { Button } from '../../components/common/Button.tsx';
import { ErrorState } from '../../components/common/ErrorState.tsx';
import { Skeleton } from '../../components/common/Skeleton.tsx';
import { useAdminCategories, useAdminMutation, useAdminProduct } from '../../hooks/useAdmin.ts';
import { ApiError } from '../../lib/apiClient.ts';
import { paths } from '../../routes/paths.ts';
import {
  PRODUCT_FIELD_ALIASES,
  PRODUCT_FORM_FIELDS,
  productFormSchema,
  toRupeesInput,
  type ProductFormInput,
  type ProductFormOutput,
} from '../../schemas/admin.schemas.ts';
import { adminService } from '../../services/admin.service.ts';
import type {
  AdminCategory,
  AdminImage,
  AdminProduct,
  ProductInput,
  ProductStatus,
  VariantInput,
} from '../../types/admin.ts';
import { cn } from '../../utils/cn.ts';
import { applyServerErrors, errorMessage } from '../../utils/forms.ts';

const toProductInput = (v: ProductFormOutput): ProductInput => ({
  name: v.name,
  colorway: v.colorway,
  color: v.color,
  gender: v.gender,
  categoryId: v.categoryId,
  slug: v.slug,
  description: v.description,
  material: v.material,
  tags: v.tags,
  pricePaise: v.price,
  compareAtPricePaise: v.compareAt,
  status: v.status,
  isFeatured: v.isFeatured,
});

const defaultsFor = (p?: AdminProduct): ProductFormInput => ({
  name: p?.name ?? '',
  colorway: p?.colorway ?? '',
  color: p?.color ?? '',
  gender: p?.gender ?? 'UNISEX',
  categoryId: p?.categoryId ?? '',
  slug: p?.slug ?? '',
  description: p?.description ?? '',
  material: p?.material ?? '',
  tags: p?.tags.join(', ') ?? '',
  price: toRupeesInput(p?.pricePaise),
  compareAt: toRupeesInput(p?.compareAtPricePaise),
  status: p?.status ?? 'DRAFT',
  isFeatured: p?.isFeatured ?? false,
});

function useProductForm(product?: AdminProduct) {
  return useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultsFor(product),
    mode: 'onTouched',
  });
}

/** Maps a failed save onto fields (validation / slug conflict); returns true if handled. */
function applyProductErrors(err: unknown, setError: ReturnType<typeof useProductForm>['setError']) {
  if (err instanceof ApiError && err.status === 409 && /slug/i.test(err.message)) {
    setError('slug', { type: 'server', message: err.message });
    return true;
  }
  return applyServerErrors(err, setError, PRODUCT_FORM_FIELDS, PRODUCT_FIELD_ALIASES);
}

/* ── Create ─────────────────────────────────────────────────────────────── */

interface DraftSize {
  sizeLabel: string;
  sku: string;
  quantity: string;
}

const UK_RUN = ['6', '7', '8', '9', '10', '11'];

function skuPrefix(name: string, colorway: string) {
  const initials = (s: string) =>
    s
      .replace(/^VELO\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.slice(0, 2))
      .join('')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  return `VELO-${initials(name).slice(0, 6) || 'NEW'}-${initials(colorway).slice(0, 4) || 'STD'}`;
}

function CreateProduct({ categories }: { categories: AdminCategory[] }) {
  const navigate = useNavigate();
  const form = useProductForm();
  const [images, setImages] = useState<AdminImage[]>([]);
  const [sizes, setSizes] = useState<DraftSize[]>([]);
  const create = useAdminMutation(
    (body: ProductInput & { images: AdminImage[]; variants: VariantInput[] }) =>
      adminService.createProduct(body),
    { onSuccess: (p) => navigate(paths.adminProduct(p.id), { replace: true }) },
  );

  const [watchedName, watchedColorway] = form.watch(['name', 'colorway']);
  const createAlt = [watchedName, watchedColorway].filter(Boolean).join(' in ');

  const fillRun = () => {
    const { name, colorway } = form.getValues();
    const prefix = skuPrefix(name, colorway);
    setSizes(
      UK_RUN.map((s) => ({
        sizeLabel: `UK ${s}`,
        sku: `${prefix}-${s.padStart(2, '0')}`,
        quantity: '10',
      })),
    );
  };

  const onSubmit = form.handleSubmit((values) => {
    if (images.some((i) => !i.altText.trim())) return; // ImagesEditor shows the message
    create.mutate(
      {
        ...toProductInput(values),
        images,
        variants: sizes
          .filter((s) => s.sizeLabel.trim())
          .map((s) => ({
            sizeLabel: s.sizeLabel.trim(),
            sku: s.sku.trim(),
            quantity: Number(s.quantity) || 0,
            lowStockThreshold: 5,
          })),
      },
      { onError: (err) => applyProductErrors(err, form.setError) },
    );
  });

  const errorCount = Object.keys(form.formState.errors).length;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {create.isError && errorCount === 0 && (
        <Alert tone="danger">{errorMessage(create.error)}</Alert>
      )}

      <Panel title="Details">
        <ProductDetailsFields
          register={form.register}
          errors={form.formState.errors}
          categories={categories}
          showStatus
        />
      </Panel>

      <Panel title="Images" description="Upload or link images; the first is the primary image.">
        <ImagesEditor images={images} onChange={setImages} defaultAlt={createAlt} />
      </Panel>

      <Panel
        title="Sizes & stock"
        description="You can also add sizes after creating the product."
        actions={
          <Button variant="secondary" size="sm" onClick={fillRun}>
            Fill UK 6–11
          </Button>
        }
      >
        {sizes.length === 0 ? (
          <p className="text-sm text-ink-muted">No sizes yet.</p>
        ) : (
          <ul className="space-y-2">
            {sizes.map((s, i) => (
              <li key={i} className="grid grid-cols-[6rem_1fr_6rem_auto] items-center gap-2">
                {(['sizeLabel', 'sku', 'quantity'] as const).map((field) => (
                  <input
                    key={field}
                    aria-label={`${field === 'sizeLabel' ? 'Size' : field === 'sku' ? 'SKU' : 'Stock'} ${i + 1}`}
                    value={s[field]}
                    inputMode={field === 'quantity' ? 'numeric' : undefined}
                    onChange={(e) =>
                      setSizes(
                        sizes.map((row, j) =>
                          j === i
                            ? {
                                ...row,
                                [field]:
                                  field === 'sku' ? e.target.value.toUpperCase() : e.target.value,
                              }
                            : row,
                        ),
                      )
                    }
                    className="h-9 rounded-sm border border-line-strong bg-surface px-2 text-sm"
                  />
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove size ${i + 1}`}
                  onClick={() => setSizes(sizes.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => setSizes([...sizes, { sizeLabel: '', sku: '', quantity: '0' }])}
        >
          <Plus aria-hidden className="size-4" /> Add size
        </Button>
      </Panel>

      <div className="flex justify-end gap-3">
        <Button type="submit" size="lg" loading={create.isPending}>
          Create product
        </Button>
      </div>
    </form>
  );
}

/* ── Edit ───────────────────────────────────────────────────────────────── */

function DetailsPanel({
  product,
  categories,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
}) {
  const form = useProductForm(product);
  const update = useAdminMutation(
    // Status changes only via the Publish/Unpublish/Archive actions, never from this form
    // (its copy of the status could be stale right after one of those actions).
    ({ status: _status, ...input }: ProductInput) => adminService.updateProduct(product.id, input),
    {
      onSuccess: (p) => form.reset(defaultsFor(p)),
    },
  );

  return (
    <Panel title="Details">
      <form
        noValidate
        onSubmit={form.handleSubmit((v) =>
          update.mutate(toProductInput(v), {
            onError: (err) => applyProductErrors(err, form.setError),
          }),
        )}
        className="space-y-5"
      >
        {update.isSuccess && !form.formState.isDirty && (
          <Alert tone="success">Details saved.</Alert>
        )}
        {update.isError && Object.keys(form.formState.errors).length === 0 && (
          <Alert tone="danger">{errorMessage(update.error)}</Alert>
        )}
        <ProductDetailsFields
          register={form.register}
          errors={form.formState.errors}
          categories={categories}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
            Save details
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ImagesPanel({ product }: { product: AdminProduct }) {
  const [images, setImages] = useState<AdminImage[]>(product.images);
  const save = useAdminMutation((list: AdminImage[]) =>
    adminService.replaceImages(product.id, list),
  );
  const dirty =
    JSON.stringify(images.map((i) => [i.url, i.altText])) !==
    JSON.stringify(product.images.map((i) => [i.url, i.altText]));

  return (
    <Panel
      title="Images"
      description="Reorder with the arrows; the first image is the primary."
      actions={
        <Button
          size="sm"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate(images)}
        >
          Save images
        </Button>
      }
    >
      {save.isError && (
        <Alert tone="danger" className="mb-4">
          {errorMessage(save.error)}
        </Alert>
      )}
      <ImagesEditor
        images={images}
        onChange={setImages}
        defaultAlt={`${product.name} in ${product.colorway}`}
      />
    </Panel>
  );
}

const STATUS_ACTIONS: Record<ProductStatus, Array<{ to: ProductStatus; label: string }>> = {
  DRAFT: [
    { to: 'ACTIVE', label: 'Publish' },
    { to: 'ARCHIVED', label: 'Archive' },
  ],
  ACTIVE: [
    { to: 'DRAFT', label: 'Unpublish' },
    { to: 'ARCHIVED', label: 'Archive' },
  ],
  ARCHIVED: [{ to: 'DRAFT', label: 'Restore as draft' }],
};

function EditProduct({
  product,
  categories,
}: {
  product: AdminProduct;
  categories: AdminCategory[];
}) {
  const navigate = useNavigate();
  const setStatus = useAdminMutation((status: ProductStatus) =>
    adminService.updateProduct(product.id, { status }),
  );
  const remove = useAdminMutation(() => adminService.deleteProduct(product.id), {
    onSuccess: () => navigate(paths.adminProducts, { replace: true }),
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
        <ProductStatusBadge status={product.status} />
        <span className="text-sm text-ink-muted">
          {product.status === 'ACTIVE' ? 'Visible in the store.' : 'Hidden from the store.'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {product.status === 'ACTIVE' && (
            <a
              href={paths.product(product.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold hover:bg-surface-muted"
            >
              View in store <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
          {STATUS_ACTIONS[product.status].map((a) => (
            <Button
              key={a.to}
              size="sm"
              variant={a.to === 'ACTIVE' ? 'primary' : 'secondary'}
              loading={setStatus.isPending && setStatus.variables === a.to}
              onClick={() => setStatus.mutate(a.to)}
            >
              {a.label}
            </Button>
          ))}
        </div>
        {setStatus.isError && (
          <p role="alert" className="w-full text-xs font-medium text-danger">
            {errorMessage(setStatus.error)}
          </p>
        )}
      </div>

      {/* Remount on product id change so local form state resets. */}
      <DetailsPanel key={`details-${product.id}`} product={product} categories={categories} />
      <ImagesPanel
        key={`images-${product.id}-${product.images.map((i) => i.url).join()}`}
        product={product}
      />
      <Panel
        title="Sizes & stock"
        description="Edit a row, then Save. Stock highlighted in amber is at or below its low-stock level."
      >
        <SizesEditor product={product} />
      </Panel>

      <Panel title="Delete product" className="border-danger/30">
        {product.canDelete ? (
          confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm">Permanently delete this product and its sizes?</span>
              <Button
                variant="danger"
                size="sm"
                loading={remove.isPending}
                onClick={() => remove.mutate(undefined)}
              >
                Yes, delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden className="size-4" /> Delete product
            </Button>
          )
        ) : (
          <p className="text-sm text-ink-muted">
            This product appears in past orders, so it can’t be deleted — archive it instead to
            remove it from the store.
          </p>
        )}
        {remove.isError && (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {errorMessage(remove.error)}
          </p>
        )}
      </Panel>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AdminProductEditorPage() {
  const { id } = useParams();
  const categories = useAdminCategories();
  const product = useAdminProduct(id);
  const isNew = !id;

  const title = isNew ? 'New product' : product.data ? `${product.data.name}` : 'Product';

  return (
    <AdminPage
      title={title}
      description={!isNew && product.data ? product.data.colorway : undefined}
      actions={
        <Link
          to={paths.adminProducts}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" /> All products
        </Link>
      }
    >
      {categories.isPending || (!isNew && product.isPending) ? (
        <Skeleton className="h-[32rem] rounded-lg" />
      ) : categories.isError || (!isNew && product.isError) ? (
        <ErrorState
          title={
            product.error instanceof ApiError && product.error.status === 404
              ? 'Product not found'
              : undefined
          }
          message="We couldn't load this product."
          onRetry={() => {
            void categories.refetch();
            void product.refetch();
          }}
        />
      ) : isNew ? (
        <CreateProduct categories={categories.data} />
      ) : (
        <div className={cn(product.isFetching && 'transition-opacity')}>
          <EditProduct product={product.data!} categories={categories.data} />
        </div>
      )}
    </AdminPage>
  );
}
