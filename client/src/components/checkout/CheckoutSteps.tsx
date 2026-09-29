import { Check } from 'lucide-react';
import { cn } from '../../utils/cn.ts';
import { CHECKOUT_STEPS, type CheckoutStep } from './steps.ts';

interface CheckoutStepsProps {
  current: CheckoutStep;
  /** Completed steps can be revisited. */
  onSelect: (step: CheckoutStep) => void;
}

export function CheckoutSteps({ current, onSelect }: CheckoutStepsProps) {
  const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === current);

  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2 text-sm sm:gap-4">
        <li className="text-ink-muted">Bag</li>
        {CHECKOUT_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-4">
              <span aria-hidden className="h-px w-4 bg-line-strong sm:w-8" />
              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:underline"
                >
                  <Check aria-hidden className="size-4 text-success" />
                  {step.label}
                  <span className="sr-only">(completed — edit)</span>
                </button>
              ) : (
                <span
                  aria-current={active ? 'step' : undefined}
                  className={cn(active ? 'font-semibold text-ink' : 'text-ink-subtle')}
                >
                  {step.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
