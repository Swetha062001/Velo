import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { AdminCategory } from '../../../types/admin.ts';
import type { ProductFormInput } from '../../../schemas/admin.schemas.ts';
import { Input } from '../../common/Input.tsx';
import { Select } from '../../common/Select.tsx';
import { Textarea } from '../../common/Textarea.tsx';

interface Props {
  register: UseFormRegister<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
  categories: AdminCategory[];
  /** Only when creating: on the edit screen, status is owned by the Publish/Archive actions. */
  showStatus?: boolean;
}

/** The product's descriptive fields — shared by the create and edit screens. */
export function ProductDetailsFields({ register, errors, categories, showStatus = false }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          placeholder="VELO Aero One"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Colourway"
          placeholder="Ember Orange"
          error={errors.colorway?.message}
          {...register('colorway')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Category"
          placeholder="Select category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          error={errors.categoryId?.message}
          {...register('categoryId')}
        />
        <Select
          label="Gender"
          options={[
            { value: 'UNISEX', label: 'Unisex' },
            { value: 'MEN', label: 'Men' },
            { value: 'WOMEN', label: 'Women' },
          ]}
          error={errors.gender?.message}
          {...register('gender')}
        />
        <Input
          label="Colour family"
          placeholder="orange"
          hint="Used by filters and the AI assistant"
          error={errors.color?.message}
          {...register('color')}
        />
      </div>
      <Textarea
        label="Description"
        rows={5}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Material (optional)"
          error={errors.material?.message}
          {...register('material')}
        />
        <Input
          label="Tags (comma-separated)"
          placeholder="running, lightweight, everyday"
          error={
            errors.tags?.message ??
            (errors.tags as { root?: { message?: string } } | undefined)?.root?.message
          }
          {...register('tags')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Price (₹)"
          inputMode="decimal"
          placeholder="4999"
          error={errors.price?.message}
          {...register('price')}
        />
        <Input
          label="Compare-at price (₹, optional)"
          inputMode="decimal"
          hint="Shown struck through as the old price"
          error={errors.compareAt?.message}
          {...register('compareAt')}
        />
        <Input
          label="URL slug (optional)"
          placeholder="auto from name + colourway"
          error={errors.slug?.message}
          {...register('slug')}
        />
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-3">
        {showStatus && (
          <Select
            label="Status"
            options={[
              { value: 'DRAFT', label: 'Draft — hidden from the store' },
              { value: 'ACTIVE', label: 'Active — visible in the store' },
              { value: 'ARCHIVED', label: 'Archived — retired' },
            ]}
            error={errors.status?.message}
            {...register('status')}
          />
        )}
        <label className="flex h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--velo-ink)]"
            {...register('isFeatured')}
          />
          Feature on the home page
        </label>
      </div>
    </div>
  );
}
