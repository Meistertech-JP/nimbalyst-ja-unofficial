/**
 * A card's history, as a strip you can pull cards out of.
 *
 * Lazily imported by `CanvasSurface`, on the same reasoning as the comment
 * composer: opening a board must not download the machinery for a panel that
 * appears only after someone asks for it by name.
 *
 * **Screen space, not board space.** The plan describes the rail as a card
 * expanding into a horizontal strip, and the strip does belong to one card --
 * but the strip is a *reading* surface, and a reading surface under React
 * Flow's transform is 7px tall at half zoom. `CanvasCommentComposer` made the
 * same call for the same reason. What lives in board space is the result: a
 * pinned revision becomes a real card next to its source, which is where the
 * spatial comparison the plan is actually after happens.
 *
 * Every field here is either from the room or absent. There is no inference and
 * no placeholder standing in for a missing session -- a revision that no
 * session can be attributed to shows its author and stops, because a rail that
 * guesses is worse than no rail for the question it exists to answer.
 */

import { useEffect, useRef, useState, type JSX } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';

import type { CanvasRevisionEntry, CanvasRevisionSource } from './canvasRevisions';
import type { CanvasCardReference } from './canvasCallbacks';

export interface CanvasRevisionRailProps {
  /** The card whose history this is. */
  nodeId: string;
  label: string;
  reference: CanvasCardReference;
  source: CanvasRevisionSource;
  /** Add a card for this revision beside the source card. */
  onPin(entry: CanvasRevisionEntry): void;
  onClose(): void;
  /** False on a read-only board: history is still readable, pinning is not. */
  canPin: boolean;
}

type RailState =
  | { status: 'loading' }
  | { status: 'ready'; entries: readonly CanvasRevisionEntry[] }
  | { status: 'unavailable' };

export function CanvasRevisionRail({
  nodeId,
  label,
  reference,
  source,
  onPin,
  onClose,
  canPin,
}: CanvasRevisionRailProps): JSX.Element {
  const { t, i18n } = useTranslation('editor');
  const [state, setState] = useState<RailState>({ status: 'loading' });

  // The reference object is rebuilt whenever the board's document changes --
  // which is every drag frame of any card on the board. Keying the fetch on the
  // *document it names* rather than the object identity is what keeps a rail
  // open next to someone moving cards around from re-listing on every frame.
  const referenceRef = useRef(reference);
  referenceRef.current = reference;
  const referenceKey =
    reference.kind === 'doc' ? reference.uri : reference.path;

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    source
      .list(referenceRef.current)
      .then((entries) => {
        if (live) setState({ status: 'ready', entries });
      })
      .catch((error: unknown) => {
        // "Cannot ask" and "has no history" are different answers and the rail
        // says which one it got; a failed request rendered as an empty strip
        // would be a claim about the document.
        console.warn('[CanvasRevisionRail] revision list failed', error);
        if (live) setState({ status: 'unavailable' });
      });
    return () => {
      live = false;
    };
  }, [source, referenceKey]);

  return (
    <div className="canvas-revision-rail" data-canvas-revision-rail={nodeId}>
      <div className="canvas-revision-rail__header">
        <span className="canvas-revision-rail__title select-text">
          {t('canvas.history.title', { label })}
        </span>
        <button
          type="button"
          className="canvas-revision-rail__close"
          onClick={onClose}
          aria-label={t('canvas.history.close')}
        >
          {t('canvas.history.close')}
        </button>
      </div>
      {state.status === 'loading' && (
        <div className="canvas-revision-rail__note">
          {t('canvas.history.loading')}
        </div>
      )}
      {state.status === 'unavailable' && (
        <div className="canvas-revision-rail__note">
          {t('canvas.history.unavailable')}
        </div>
      )}
      {state.status === 'ready' && state.entries.length === 0 && (
        <div className="canvas-revision-rail__note">
          {t('canvas.history.empty')}
        </div>
      )}
      {state.status === 'ready' && state.entries.length > 0 && (
        <ol className="canvas-revision-rail__strip">
          {state.entries.map((entry) => (
            <li
              key={entry.revisionId}
              className="canvas-revision-rail__entry"
              data-canvas-revision-id={entry.revisionId}
            >
              <div className="canvas-revision-rail__entry-head">
                <span className="canvas-revision-rail__version">
                  {t('canvas.history.version', { sequence: entry.sequence })}
                </span>
                <time
                  className="canvas-revision-rail__time"
                  dateTime={new Date(entry.createdAt).toISOString()}
                >
                  {formatRevisionTime(
                    entry.createdAt,
                    i18n.resolvedLanguage ?? i18n.language
                  )}
                </time>
              </div>
              <RevisionProvenance entry={entry} />
              {canPin && (
                <button
                  type="button"
                  className="canvas-revision-rail__pin"
                  onClick={() => onPin(entry)}
                >
                  {t('canvas.history.pin_as_card', {
                    sequence: entry.sequence,
                  })}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RevisionProvenance({
  entry,
}: {
  entry: CanvasRevisionEntry;
}): JSX.Element {
  const { t } = useTranslation('editor');
  const { provenance } = entry;
  return (
    <dl className="canvas-revision-rail__provenance select-text">
      <div className="canvas-revision-rail__fact">
        <dt>{t('canvas.history.by')}</dt>
        <dd>{provenance.authorName ?? provenance.authorUserId}</dd>
      </div>
      {provenance.sessionId !== null && (
        <div className="canvas-revision-rail__fact">
          <dt>{t('canvas.history.session')}</dt>
          <dd>{provenance.sessionName ?? provenance.sessionId}</dd>
        </div>
      )}
      {provenance.prompt !== null && (
        <div className="canvas-revision-rail__fact canvas-revision-rail__fact--prompt">
          <dt>{t('canvas.history.prompt')}</dt>
          <dd title={provenance.prompt}>{provenance.prompt}</dd>
        </div>
      )}
      {provenance.commit !== null && (
        <div className="canvas-revision-rail__fact">
          <dt>{t('canvas.history.commit')}</dt>
          <dd title={provenance.commit.subject ?? undefined}>
            {provenance.commit.sha.slice(0, 7)}
          </dd>
        </div>
      )}
    </dl>
  );
}

function formatRevisionTime(createdAt: number, language: string): string {
  return new Date(createdAt).toLocaleString(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
