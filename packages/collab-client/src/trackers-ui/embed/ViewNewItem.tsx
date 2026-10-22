import { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

/** A refused create keeps its title in place for correction or retry. */
export function ViewNewItem({ onCreate }: { onCreate(title: string, requestId: string): Promise<void> }) {
  const { t } = useTranslation('tracker');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <button type="button" className="px-3 py-2 text-left text-xs text-nim-link" onClick={() => setOpen(true)}>+ {t('placed_view_embed.new_item')}</button>;
  return <form className="flex flex-wrap gap-2 p-2" onSubmit={event => {
    event.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true); setError(null);
    onCreate(title.trim(), requestId).then(() => { setTitle(''); setRequestId(crypto.randomUUID()); }, cause => setError(cause instanceof Error ? cause.message : t('placed_view_embed.create_failed'))).finally(() => setBusy(false));
  }}>
    <input aria-label={t('placed_view_embed.new_item_title')} autoFocus className="min-w-0 flex-1 rounded border border-nim bg-nim px-2 py-1 text-xs" value={title} disabled={busy} onChange={event => setTitle(event.target.value)} />
    <button type="submit" className="text-xs text-nim-link" disabled={busy || !title.trim()}>{busy ? t('placed_view_embed.creating') : t('placed_view_embed.create')}</button>
    <button type="button" className="text-xs" disabled={busy} onClick={() => setOpen(false)}>{t('placed_view_embed.cancel')}</button>
    {error ? <div className="w-full text-xs text-nim-error" role="alert">{error}</div> : null}
  </form>;
}
