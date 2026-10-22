import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

/** Board-local title editing; the source image and capture metadata stay intact. */
export function CanvasScreenTitle({
  label,
  readOnly,
  onRename,
}: {
  label: string;
  readOnly: boolean;
  onRename(label: string): void;
}) {
  const { t } = useTranslation('editor');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const pending = useRef(false);
  useEffect(() => {
    if (readOnly) {
      pending.current = false;
      setEditing(false);
    }
  }, [readOnly]);
  const begin = () => {
    if (readOnly) return;
    setDraft(label);
    pending.current = true;
    setEditing(true);
  };
  const finish = (save: boolean) => {
    if (!pending.current) return;
    pending.current = false;
    setEditing(false);
    const next = draft.trim();
    if (save && !readOnly && next && next !== label) onRename(next);
  };
  if (readOnly) return <span className="canvas-screen-title">{label}</span>;
  if (editing)
    return (
      <input
        autoFocus
        aria-label={t('canvas.screen_title_placeholder')}
        className="canvas-screen-title canvas-screen-title--input nodrag nowheel"
        value={draft}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            finish(event.key === 'Enter');
          }
        }}
      />
    );
  return (
    <button
      type="button"
      className="canvas-screen-title canvas-screen-title--button"
      title={t('canvas.rename_title')}
      aria-label={t('canvas.rename_aria_label', { title: label })}
      onDoubleClick={(event) => {
        event.stopPropagation();
        begin();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter' || event.key === 'F2') {
          event.preventDefault();
          begin();
        }
      }}
    >
      {label}
    </button>
  );
}
