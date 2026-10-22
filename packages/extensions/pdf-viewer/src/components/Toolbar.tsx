import { useTranslation } from '@nimbalyst/i18n/react';

interface ToolbarProps {
  totalPages: number;
  scale: number;
  fitToWidth: boolean;
  onScaleChange: (scale: number) => void;
  onFitToWidthToggle: () => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function Toolbar({ totalPages, scale, fitToWidth, onScaleChange, onFitToWidthToggle }: ToolbarProps) {
  const { t } = useTranslation('common');
  const currentZoomPercent = Math.round(scale * 100);

  const handleZoomIn = () => {
    const nextLevel = ZOOM_LEVELS.find((level) => level > scale);
    if (nextLevel) {
      onScaleChange(nextLevel);
    }
  };

  const handleZoomOut = () => {
    const prevLevel = [...ZOOM_LEVELS].reverse().find((level) => level < scale);
    if (prevLevel) {
      onScaleChange(prevLevel);
    }
  };

  const handleZoomReset = () => {
    onScaleChange(1.0);
  };

  return (
    <div className="bg-nim border-b border-nim px-4 py-2 shrink-0">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <div className="text-sm text-nim-muted">
          <span>{t('pdf_viewer.pages', { count: totalPages })}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`px-3 py-1 rounded cursor-pointer text-base font-semibold transition-all border border-nim ${fitToWidth ? 'bg-[var(--nim-primary)] text-white border-[var(--nim-primary)] hover:opacity-90' : 'bg-nim-tertiary text-nim hover:bg-nim-hover'}`}
            onClick={onFitToWidthToggle}
            title={t('pdf_viewer.fit_to_width')}
          >
            {t('pdf_viewer.fit')}
          </button>

          <button
            className="bg-nim-tertiary border border-nim text-nim px-3 py-1 rounded cursor-pointer text-base font-semibold transition-all hover:bg-nim-hover disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleZoomOut}
            disabled={scale <= ZOOM_LEVELS[0]}
            title={t('pdf_viewer.zoom_out')}
          >
            -
          </button>

          <span
            className="min-w-[50px] text-center text-sm font-medium cursor-pointer select-none hover:text-[var(--nim-primary)]"
            onClick={handleZoomReset}
            title={t('pdf_viewer.reset_zoom')}
          >
            {currentZoomPercent}%
          </span>

          <button
            className="bg-nim-tertiary border border-nim text-nim px-3 py-1 rounded cursor-pointer text-base font-semibold transition-all hover:bg-nim-hover disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleZoomIn}
            disabled={scale >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            title={t('pdf_viewer.zoom_in')}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
