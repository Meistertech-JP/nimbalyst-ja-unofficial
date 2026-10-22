import { useMemo, useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { CanvasDocument } from './CanvasDocument';
import { readCanvasNavigation } from './canvasNavigation';
import './CanvasNavigationPanel.css';

export function CanvasNavigationPanel({
  document,
  onNavigate,
  onOverview,
}: {
  document: CanvasDocument;
  onNavigate(nodeId: string): void;
  onOverview(): void;
}) {
  const { t } = useTranslation('editor');
  const items = useMemo(() => readCanvasNavigation(document), [document]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const current = items.find((item) => item.nodeId === currentId);
  const siblings = items.filter(
    (item) => item.parentId === (current?.parentId ?? null)
  );
  const index = siblings.findIndex((item) => item.nodeId === current?.nodeId);
  const children = current
    ? items.filter((item) => item.parentId === current.nodeId)
    : [];
  if (!items.length) return null;
  const go = (id: string) => {
    setCurrentId(id);
    onNavigate(id);
  };
  const overview = () => {
    setCurrentId(null);
    onOverview();
  };
  return (
    <div className="canvas-navigation nodrag nopan nowheel">
      <nav
        aria-label={t('canvas.navigation.label')}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="canvas-navigation__row">
          <button
            type="button"
            onClick={overview}
            data-canvas-help="canvas-nav-overview"
          >
            {t('canvas.navigation.overview')}
          </button>
          <select
            aria-label={t('canvas.navigation.go_to_screen')}
            value={current?.nodeId ?? ''}
            onChange={(event) => go(event.target.value)}
          >
            <option value="" disabled>
              {t('canvas.navigation.browse_screens')}
            </option>
            {items.map((item) => (
              <option key={item.nodeId} value={item.nodeId}>
                {item.parentId
                  ? `${
                      items.find((parent) => parent.nodeId === item.parentId)
                        ?.label
                    } / `
                  : ''}
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!current}
            onClick={() =>
              current?.parentId ? go(current.parentId) : overview()
            }
            data-canvas-help="canvas-nav-up"
          >
            {t('canvas.navigation.up')}
          </button>
          <button
            type="button"
            aria-label={t('canvas.navigation.previous_screen')}
            disabled={index <= 0}
            onClick={() => go(siblings[index - 1].nodeId)}
            data-canvas-help="canvas-nav-previous"
          >
            ←
          </button>
          <span className="canvas-navigation__count" aria-live="polite">
            {current
              ? t('canvas.navigation.position', { index: index + 1, count: siblings.length })
              : t('canvas.navigation.screen_count', { count: siblings.length })}
          </span>
          <button
            type="button"
            aria-label={t('canvas.navigation.next_screen')}
            disabled={index >= siblings.length - 1}
            onClick={() => go(siblings[index + 1].nodeId)}
            data-canvas-help="canvas-nav-next"
          >
            →
          </button>
        </div>
        {children.length > 0 && (
          <select
            aria-label={t('canvas.navigation.explore_child')}
            value=""
            onChange={(event) => go(event.target.value)}
          >
            <option value="" disabled>
              {t('canvas.navigation.explore')}
            </option>
            {children.map((item) => (
              <option key={item.nodeId} value={item.nodeId}>
                {item.label}
              </option>
            ))}
          </select>
        )}
      </nav>
    </div>
  );
}
