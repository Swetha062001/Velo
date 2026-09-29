import type { ComponentProps } from 'react';
import { imageSrcSet, imageUrl } from '../../utils/images.ts';

interface ProductImageProps extends Omit<ComponentProps<'img'>, 'src' | 'srcSet'> {
  src: string;
  /** Rendered width hint for the fallback `src`. */
  width?: number;
  /** `sizes` attribute describing the displayed width at each breakpoint. */
  sizes?: string;
}

/** Responsive, lazily loaded product image. */
export function ProductImage({
  src,
  width = 640,
  sizes,
  loading = 'lazy',
  ...props
}: ProductImageProps) {
  return (
    <img
      src={imageUrl(src, width)}
      srcSet={imageSrcSet(src)}
      sizes={sizes}
      loading={loading}
      decoding="async"
      {...props}
    />
  );
}
