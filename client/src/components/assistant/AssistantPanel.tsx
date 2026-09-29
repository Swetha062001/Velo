import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUp, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../../lib/apiClient.ts';
import { productsUrl, paths } from '../../routes/paths.ts';
import { assistantService } from '../../services/assistant.service.ts';
import { useUi } from '../../store/ui.ts';
import type { AssistantReply, AssistantTurn, ShoppingIntent } from '../../types/assistant.ts';
import { cn } from '../../utils/cn.ts';
import { formatRupees } from '../../utils/money.ts';
import { Drawer } from '../common/Drawer.tsx';
import { Price } from '../product/Price.tsx';
import { ProductImage } from '../product/ProductImage.tsx';

const SUGGESTIONS = [
  'Running shoes under ₹6,000',
  'White everyday sneakers',
  'Gym shoes for women',
  'Something light for race day',
];

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  result?: AssistantReply;
  error?: boolean;
}

/** Filter chips + a catalogue URL for the filters the answer actually used. */
function effectiveFilters({ appliedFilters: f, relaxed }: AssistantReply) {
  const chips: string[] = [];
  const query: Record<string, string> = {};
  if (f.category && !relaxed.includes('category')) {
    chips.push(f.category);
    query.category = f.category;
  }
  if (f.gender && !relaxed.includes('gender')) {
    chips.push(f.gender);
    query.gender = f.gender;
  }
  if (f.colors.length && !relaxed.includes('colour')) {
    chips.push(...f.colors);
    query.color = f.colors.join(',');
  }
  if (f.size && !relaxed.includes('size')) {
    chips.push(`UK ${f.size}`);
    query.size = f.size;
  }
  if (!relaxed.includes('price')) {
    if (f.minPriceInr !== null && f.maxPriceInr !== null) {
      chips.push(`${formatRupees(f.minPriceInr)}–${formatRupees(f.maxPriceInr)}`);
    } else if (f.maxPriceInr !== null) chips.push(`under ${formatRupees(f.maxPriceInr)}`);
    else if (f.minPriceInr !== null) chips.push(`from ${formatRupees(f.minPriceInr)}`);
    if (f.minPriceInr !== null) query.minPrice = String(f.minPriceInr);
    if (f.maxPriceInr !== null) query.maxPrice = String(f.maxPriceInr);
  }
  return { chips, url: Object.keys(query).length ? productsUrl(query) : paths.products };
}

function AnswerBlock({ result, onNavigate }: { result: AssistantReply; onNavigate: () => void }) {
  const { chips, url } = effectiveFilters(result);
  return (
    <div className="space-y-3">
      {chips.length > 0 && (
        <ul aria-label="Filters used" className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted capitalize"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
      <ul className="space-y-2">
        {result.recommendations.map(({ product, reason }) => (
          <li key={product.id}>
            <Link
              to={paths.product(product.slug)}
              onClick={onNavigate}
              className="group flex gap-3 rounded-md border border-line bg-canvas p-2.5 transition-colors hover:border-ink"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted">
                {product.images[0] && (
                  <ProductImage
                    src={product.images[0].url}
                    alt=""
                    width={160}
                    sizes="80px"
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold group-hover:text-accent">
                  {product.name}
                </p>
                <p className="truncate text-xs text-ink-muted">{product.colorway}</p>
                <Price
                  pricePaise={product.pricePaise}
                  compareAtPricePaise={product.compareAtPricePaise}
                  className="mt-0.5"
                />
                <p className="mt-1 line-clamp-3 text-xs text-ink-muted">{reason}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {result.recommendations.length > 0 && (
        <Link
          to={url}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          See all matches <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  );
}

/**
 * Conversational product finder. The server does the understanding and retrieval; this
 * component only renders what it returns — products, prices and stock come from the API.
 */
export function AssistantPanel() {
  const open = useUi((s) => s.assistantOpen);
  const close = useUi((s) => s.closeAssistant);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const status = useQuery({
    queryKey: ['ai-status'],
    queryFn: ({ signal }) => assistantService.status(signal),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  const ask = useMutation({
    mutationFn: (vars: { message: string; history: AssistantTurn[]; context?: ShoppingIntent }) =>
      assistantService.ask(vars.message, vars.history, vars.context),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, ask.isPending]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const push = (m: Omit<Message, 'id'>) =>
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);

  function send(text: string) {
    const message = text.trim();
    if (message.length < 2 || ask.isPending) return;
    const history: AssistantTurn[] = messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 800) }));
    const context = [...messages].reverse().find((m) => m.result)?.result?.appliedFilters;

    push({ role: 'user', text: message });
    setDraft('');
    ask.mutate(
      { message, history, context },
      {
        onSuccess: (result) => push({ role: 'assistant', text: result.reply, result }),
        onError: (err) =>
          push({
            role: 'assistant',
            error: true,
            text:
              err instanceof ApiError && err.status === 429
                ? err.message
                : 'Sorry — I could not reach the assistant. Please try again.',
          }),
      },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  const aiOn = status.data?.available;
  const modeLabel = status.isPending
    ? null
    : aiOn
      ? `Local AI · ${status.data?.model}`
      : 'Smart search mode';

  return (
    <Drawer
      open={open}
      onClose={close}
      title="VELO assistant"
      width="lg"
      footer={
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Describe what you are looking for
          </label>
          <input
            ref={inputRef}
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="e.g. black trainers for the gym under ₹6,000"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-canvas px-3 text-sm placeholder:text-ink-subtle focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={ask.isPending || draft.trim().length < 2}
            aria-label="Send"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-inverse text-inverse-fg transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-40 disabled:hover:bg-inverse disabled:hover:text-inverse-fg"
          >
            <ArrowUp aria-hidden className="size-5" />
          </button>
        </form>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="mb-6 flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-sm">
              Tell me what you need — the occasion, colour, budget or size — and I will find pairs
              from the VELO catalogue.
            </p>
            {modeLabel && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', aiOn ? 'bg-success' : 'bg-ink-subtle')}
                />
                {modeLabel}
              </p>
            )}
          </div>
        </div>

        {messages.length === 0 && (
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              Try asking
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-5">
          {messages.map((m) =>
            m.role === 'user' ? (
              <p
                key={m.id}
                className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-xs bg-inverse px-3.5 py-2 text-sm text-inverse-fg"
              >
                <span className="sr-only">You: </span>
                {m.text}
              </p>
            ) : (
              <div key={m.id} className="space-y-3">
                <p className={cn('text-sm', m.error && 'text-danger')}>
                  <span className="sr-only">Assistant: </span>
                  {m.text}
                </p>
                {m.result && <AnswerBlock result={m.result} onNavigate={close} />}
              </div>
            ),
          )}
          {ask.isPending && (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="flex gap-1" aria-hidden>
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-ink-subtle"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
              Finding pairs…
            </p>
          )}
        </div>
        <div ref={endRef} />
      </div>
    </Drawer>
  );
}

/** Floating entry point, bottom-right on every storefront page. */
export function AssistantLauncher() {
  const open = useUi((s) => s.assistantOpen);
  const openAssistant = useUi((s) => s.openAssistant);
  if (open) return null;
  return (
    <button
      type="button"
      onClick={openAssistant}
      aria-haspopup="dialog"
      className="fixed right-4 bottom-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-inverse pr-5 pl-4 text-sm font-semibold text-inverse-fg shadow-lg transition-colors hover:bg-accent hover:text-accent-fg sm:right-6 sm:bottom-6"
    >
      <Sparkles aria-hidden className="size-4" />
      Ask VELO AI
    </button>
  );
}
