import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useCurrentUser } from '../../hooks/useAuth.ts';
import { useToggleWishlist, useWishlistIds } from '../../hooks/useWishlist.ts';
import { rememberWishlistIntent } from '../../lib/wishlistIntent.ts';
import type { ProductSummary } from '../../types/catalog.ts';
import { cn } from '../../utils/cn.ts';
import { loginUrl } from '../../utils/redirect.ts';

interface WishlistButtonProps {
  product: ProductSummary;
  /** `overlay`: round button on product imagery. `inline`: square button beside Add to bag. */
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function WishlistButton({ product, variant = 'overlay', className }: WishlistButtonProps) {
  const { data: user } = useCurrentUser();
  const savedIds = useWishlistIds();
  const toggle = useToggleWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const saved = savedIds.has(product.id);
  const label = saved
    ? `Remove ${product.name} ${product.colorway} from wishlist`
    : `Save ${product.name} ${product.colorway} to wishlist`;

  function handleClick() {
    if (!user) {
      rememberWishlistIntent(product.id);
      navigate(loginUrl(location.pathname + location.search));
      return;
    }
    toggle.mutate({ product, saved });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Saved to wishlist' : 'Save to wishlist'}
      className={cn(
        'inline-flex items-center justify-center transition-colors',
        // Overlay sits in the image corner, above the card's full-size link (z-10).
        variant === 'overlay'
          ? 'absolute top-3 right-3 z-10 size-9 rounded-full bg-canvas/90 text-ink shadow-sm backdrop-blur-sm hover:bg-canvas'
          : 'relative size-13 shrink-0 rounded-md border border-line-strong hover:border-ink',
        className,
      )}
    >
      <Heart
        aria-hidden
        strokeWidth={1.75}
        className={cn(
          'transition-transform duration-200 ease-velo',
          variant === 'overlay' ? 'size-4' : 'size-5',
          saved && 'scale-110 fill-accent text-accent',
        )}
      />
    </button>
  );
}
