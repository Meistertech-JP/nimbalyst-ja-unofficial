import type { TestNode } from '../types';
import { useTranslation } from '@nimbalyst/i18n/react';

interface ErrorDetailProps {
  node: TestNode;
  onOpenFile: (filePath: string, line?: number) => void;
  onViewTrace?: (tracePath: string) => void;
}

export function ErrorDetail({ node, onOpenFile, onViewTrace }: ErrorDetailProps) {
  const { t } = useTranslation('extensions');
  if (!node.error) {
    return (
      <div className="pw-error-detail pw-empty">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#666' }}>
          {node.status === 'passed' ? 'check_circle' : 'info'}
        </span>
        <p>
          {node.status === 'passed'
            ? t('playwright.error_detail.passed')
            : node.status === 'skipped'
            ? t('playwright.error_detail.skipped')
            : t('playwright.error_detail.select_failed_test')}
        </p>
      </div>
    );
  }

  const { message, stack, screenshotPath } = node.error;

  // Parse stack trace to extract clickable file locations
  const stackLines = stack?.split('\n') ?? [];

  return (
    <div className="pw-error-detail">
      {/* Header */}
      <div className="pw-error-header">
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ef4444' }}>
          cancel
        </span>
        <span className="pw-error-test-name">{node.name}</span>
        {node.duration != null && (
          <span className="pw-tree-duration">
            {node.duration < 1000 ? `${node.duration}ms` : `${(node.duration / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Error message */}
      <div className="pw-error-message">
        <pre>{message}</pre>
      </div>

      {/* Expected vs Actual */}
      {node.error.expected != null && node.error.actual != null && (
        <div className="pw-error-diff">
          <div className="pw-diff-col">
            <div className="pw-diff-label">{t('playwright.error_detail.expected')}</div>
            <pre className="pw-diff-value pw-diff-expected">{node.error.expected}</pre>
          </div>
          <div className="pw-diff-col">
            <div className="pw-diff-label">{t('playwright.error_detail.actual')}</div>
            <pre className="pw-diff-value pw-diff-actual">{node.error.actual}</pre>
          </div>
        </div>
      )}

      {/* Screenshot */}
      {screenshotPath && (
        <div className="pw-error-screenshot">
          <div className="pw-section-label">{t('playwright.error_detail.failure_screenshot')}</div>
          <img
            src={`file://${screenshotPath}`}
            alt={t('playwright.error_detail.screenshot_alt')}
            style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid #4a4a4a' }}
          />
        </div>
      )}

      {/* Stack trace */}
      {stackLines.length > 0 && (
        <div className="pw-error-stack">
          <div className="pw-section-label">{t('playwright.error_detail.stack_trace')}</div>
          <pre className="pw-stack-trace">
            {stackLines.map((line, i) => {
              const fileMatch = line.match(/at\s+.*?\((.+?):(\d+):\d+\)/);
              if (fileMatch) {
                const [, filePath, lineNum] = fileMatch;
                return (
                  <span key={i}>
                    <span
                      className="pw-stack-link"
                      onClick={() => onOpenFile(filePath, parseInt(lineNum, 10))}
                    >
                      {line}
                    </span>
                    {'\n'}
                  </span>
                );
              }
              return <span key={i}>{line}{'\n'}</span>;
            })}
          </pre>
        </div>
      )}

      {/* View Trace button */}
      {node.error.tracePath && onViewTrace && (
        <div style={{ marginTop: 12 }}>
          <button
            className="pw-trace-file-btn"
            style={{ maxWidth: 200 }}
            onClick={() => onViewTrace(node.error!.tracePath!)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timeline</span>
            <span>{t('playwright.error_detail.view_trace')}</span>
          </button>
        </div>
      )}

      {/* Retry info */}
      {node.retries != null && node.retries > 0 && (
        <div className="pw-retry-info">
          {node.retries === 1
            ? t('playwright.error_detail.retried_one')
            : t('playwright.error_detail.retried', { count: node.retries })}
        </div>
      )}
    </div>
  );
}
