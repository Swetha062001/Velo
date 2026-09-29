import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAdminMutation } from '../../../hooks/useAdmin.ts';
import { adminService } from '../../../services/admin.service.ts';
import type { AdminProduct, AdminVariant, VariantInput } from '../../../types/admin.ts';
import { cn } from '../../../utils/cn.ts';
import { errorMessage } from '../../../utils/forms.ts';
import { Button } from '../../common/Button.tsx';
import { Table, Td, Th } from '../AdminUI.tsx';

const cell =
  'h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-sm tabular-nums hover:border-ink-muted';

const toPaise = (rupees: string) =>
  rupees.trim() === '' ? null : Math.round(Number(rupees) * 100);

/** One editable size row: variant fields and stock are saved together. */
function SizeRow({ variant }: { variant: AdminVariant }) {
  const [size, setSize] = useState(variant.sizeLabel);
  const [sku, setSku] = useState(variant.sku);
  const [override, setOverride] = useState(
    variant.priceOverridePaise === null ? '' : String(variant.priceOverridePaise / 100),
  );
  const [quantity, setQuantity] = useState(String(variant.quantity));
  const [threshold, setThreshold] = useState(String(variant.lowStockThreshold));
  const [active, setActive] = useState(variant.isActive);

  const save = useAdminMutation(async () => {
    const variantChanges = {
      ...(size !== variant.sizeLabel && { sizeLabel: size }),
      ...(sku !== variant.sku && { sku }),
      ...(toPaise(override) !== variant.priceOverridePaise && {
        priceOverridePaise: toPaise(override),
      }),
      ...(active !== variant.isActive && { isActive: active }),
    };
    if (Object.keys(variantChanges).length)
      await adminService.updateVariant(variant.id, variantChanges);
    if (Number(quantity) !== variant.quantity || Number(threshold) !== variant.lowStockThreshold) {
      await adminService.updateInventory(variant.id, {
        quantity: Number(quantity),
        lowStockThreshold: Number(threshold),
      });
    }
  });
  const remove = useAdminMutation(() => adminService.deleteVariant(variant.id));

  const dirty =
    size !== variant.sizeLabel ||
    sku !== variant.sku ||
    toPaise(override) !== variant.priceOverridePaise ||
    Number(quantity) !== variant.quantity ||
    Number(threshold) !== variant.lowStockThreshold ||
    active !== variant.isActive;
  const invalid =
    !size.trim() ||
    !/^[A-Za-z0-9-]{3,40}$/.test(sku) ||
    !/^\d+$/.test(quantity) ||
    !/^\d+$/.test(threshold);
  const low = Number(quantity) <= Number(threshold);
  const error = save.error ?? remove.error;

  return (
    <>
      <tr className={cn(!active && 'opacity-60')}>
        <Td>
          <input
            aria-label="Size"
            className={cell}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </Td>
        <Td>
          <input
            aria-label="SKU"
            className={cn(cell, 'uppercase')}
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
          />
        </Td>
        <Td>
          <input
            aria-label="Price override (₹)"
            placeholder="—"
            inputMode="decimal"
            className={cell}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </Td>
        <Td>
          <input
            aria-label="Stock"
            inputMode="numeric"
            className={cn(cell, low && 'border-warning text-warning')}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Td>
        <Td>
          <input
            aria-label="Low-stock threshold"
            inputMode="numeric"
            className={cell}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Td>
        <Td className="text-center">
          <input
            type="checkbox"
            aria-label="Size available"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-[var(--velo-ink)]"
          />
        </Td>
        <Td className="whitespace-nowrap text-right">
          <Button
            size="sm"
            variant={dirty ? 'primary' : 'secondary'}
            disabled={!dirty || invalid}
            loading={save.isPending}
            onClick={() => save.mutate(undefined)}
          >
            Save
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="ml-1"
            loading={remove.isPending}
            aria-label={`Delete size ${variant.sizeLabel}`}
            onClick={() => remove.mutate(undefined)}
          >
            {!remove.isPending && <Trash2 aria-hidden className="size-4" />}
          </Button>
        </Td>
      </tr>
      {error && (
        <tr>
          <td colSpan={7} className="px-4 pb-3 text-xs font-medium text-danger" role="alert">
            {errorMessage(error)}
          </td>
        </tr>
      )}
    </>
  );
}

function AddSizeForm({ product }: { product: AdminProduct }) {
  const [size, setSize] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const add = useAdminMutation(
    (input: VariantInput) => adminService.addVariant(product.id, input),
    {
      onSuccess: () => {
        setSize('');
        setSku('');
        setQuantity('0');
      },
    },
  );
  const valid = size.trim() && /^[A-Za-z0-9-]{3,40}$/.test(sku) && /^\d+$/.test(quantity);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          add.mutate({
            sizeLabel: size.trim(),
            sku,
            quantity: Number(quantity),
            lowStockThreshold: 5,
          });
      }}
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <label className="text-xs font-medium">
        Size
        <input
          className={cn(cell, 'mt-1 w-24')}
          placeholder="UK 12"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
      </label>
      <label className="text-xs font-medium">
        SKU
        <input
          className={cn(cell, 'mt-1 w-48 uppercase')}
          placeholder="VELO-XXXX-12"
          value={sku}
          onChange={(e) => setSku(e.target.value.toUpperCase())}
        />
      </label>
      <label className="text-xs font-medium">
        Stock
        <input
          className={cn(cell, 'mt-1 w-20')}
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      <Button type="submit" variant="secondary" size="sm" disabled={!valid} loading={add.isPending}>
        <Plus aria-hidden className="size-4" /> Add size
      </Button>
      {add.isError && (
        <p role="alert" className="w-full text-xs font-medium text-danger">
          {errorMessage(add.error)}
        </p>
      )}
    </form>
  );
}

/** Sizes, SKUs, price overrides and stock for an existing product. */
export function SizesEditor({ product }: { product: AdminProduct }) {
  return (
    <div>
      {product.variants.length === 0 ? (
        <p className="rounded-md border border-dashed border-warning/50 bg-warning-soft px-4 py-3 text-sm text-warning">
          This product has no sizes yet, so it can’t be bought. Add at least one below.
        </p>
      ) : (
        <Table label="Sizes and stock">
          <thead>
            <tr>
              <Th className="w-28">Size</Th>
              <Th>SKU</Th>
              <Th className="w-32">Price override ₹</Th>
              <Th className="w-24">Stock</Th>
              <Th className="w-24">Low at</Th>
              <Th className="w-20 text-center">Active</Th>
              <Th className="w-36" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {product.variants.map((v) => (
              // Remount when server data changes so the row resets to saved values.
              <SizeRow
                key={`${v.id}:${v.sku}:${v.sizeLabel}:${v.quantity}:${v.lowStockThreshold}:${v.isActive}:${v.priceOverridePaise}`}
                variant={v}
              />
            ))}
          </tbody>
        </Table>
      )}
      <AddSizeForm product={product} />
    </div>
  );
}
