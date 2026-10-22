// @vitest-environment jsdom
import { Provider } from 'jotai';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { store } from '@nimbalyst/runtime/store';
import {
  collabDocumentStateAtom,
  collabAwarenessAtom,
  DEFAULT_COLLAB_DOCUMENT_STATE,
} from '../../../store/atoms/collabEditor';
import { trackerContentCollabKey } from '../../../hooks/trackerContentCollabKey';
// Imported from the standalone chrome module, not TrackerItemDetail: mounting
// the detail would drag the whole editor stack into this test.
import {
  TrackerDocumentHeaderMeta,
  trackerBreadcrumbSegments,
} from '../TrackerDocumentHeaderMeta';

const ITEM_ID = 'item-1';
const COLLAB_KEY = trackerContentCollabKey(ITEM_ID);
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

function renderMeta(
  props: Partial<Parameters<typeof TrackerDocumentHeaderMeta>[0]> = {},
  i18n = japaneseI18n,
  preference: 'en' | 'ja' = 'ja',
) {
  render(
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US">
      <Provider store={store}>
        <TrackerDocumentHeaderMeta
          itemId={ITEM_ID}
          title="Pill item"
          breadcrumb={{
            kind: 'file',
            segments: ['Features', 'plan.md'],
            dirty: false,
            fullPath: '/ws/Features/plan.md',
          }}
          showCollabChrome={false}
          {...props}
        />
      </Provider>
    </UiLanguageProvider>,
  );
}

describe('trackerBreadcrumbSegments', () => {
  it('uses the backing file path when the item has one', () => {
    const result = trackerBreadcrumbSegments(
      { kind: 'file', segments: ['Features', 'plan.md'], dirty: false, fullPath: '/ws/Features/plan.md' },
      'Ignored title',
    );

    expect(result.segments).toEqual(['Features', 'plan.md']);
    expect(result.tooltip).toBe('/ws/Features/plan.md');
  });

  it('names collection, type and title when there is no backing file', () => {
    const result = trackerBreadcrumbSegments(
      { kind: 'degraded', collection: 'Trackers', typeLabel: 'Specs' },
      'Pill item',
    );

    expect(result.segments).toEqual(['Trackers', 'Specs', 'Pill item']);
    expect(result.tooltip).toBe('Trackers / Specs / Pill item');
  });
});

describe('TrackerDocumentHeaderMeta', () => {
  afterEach(() => {
    cleanup();
    store.set(collabDocumentStateAtom(COLLAB_KEY), DEFAULT_COLLAB_DOCUMENT_STATE);
    store.set(collabAwarenessAtom(COLLAB_KEY), new Map());
  });

  it('shows the backing file path with no dirty dot while it is saved', () => {
    renderMeta();

    expect(screen.getByTestId('tracker-document-breadcrumb').textContent).toContain('plan.md');
    expect(screen.queryByTestId('tracker-document-breadcrumb-dirty')).toBeNull();
  });

  it('marks the breadcrumb dirty with a Japanese tooltip when the backing file has unsaved edits', () => {
    renderMeta({
      breadcrumb: {
        kind: 'file',
        segments: ['plans', 'x.md'],
        dirty: true,
        fullPath: '/ws/plans/x.md',
      },
    });

    expect(screen.getByTestId('tracker-document-breadcrumb-dirty').getAttribute('title')).toBe('未保存の変更');
  });

  it('falls back to collection and type for a DB-only item', () => {
    renderMeta({
      breadcrumb: { kind: 'degraded', collection: 'Trackers', typeLabel: 'Specs' },
    });

    const breadcrumb = screen.getByTestId('tracker-document-breadcrumb');
    expect(breadcrumb.textContent).toContain('Trackers');
    expect(breadcrumb.textContent).toContain('Specs');
    expect(breadcrumb.textContent).toContain('Pill item');
  });

  it('shows the connection state only for a collaborative body', () => {
    renderMeta();
    expect(screen.queryByTestId('tracker-collab-sync-dot')).toBeNull();

    renderMeta({ showCollabChrome: true });
    expect(screen.getAllByTestId('tracker-collab-sync-dot').length).toBe(1);
    expect(screen.getAllByTestId('tracker-collab-sync-dot')[0].getAttribute('title'))
      .toBe('ローカルコピーを開いています…');
  });

  it('localizes only marked fallback tracker presence and preserves real and legacy Teammate names', async () => {
    const i18n = await createI18nInstance('en');
    store.set(collabDocumentStateAtom(COLLAB_KEY), {
      replica: 'ready',
      transport: 'connected',
      outbox: 'clean',
    });
    store.set(collabAwarenessAtom(COLLAB_KEY), new Map([
      ['generated-default', { name: 'Teammate', color: '#336699', nimbalystNameSource: 'system-default' }],
      ['real-name', { name: 'Teammate', color: '#663399' }],
      ['legacy-peer', { name: 'Teammate', color: '#996633' }],
      ['email-fallback', { name: 'rowan@example.test', color: '#339966' }],
    ]));
    renderMeta({ showCollabChrome: true }, i18n, 'en');

    const getTitles = () => Array.from(
      screen.getByTestId('tracker-collab-presence').querySelectorAll('[title]'),
    ).map((element) => element.getAttribute('title'));
    expect(getTitles()).toEqual(['Teammate', 'Teammate', 'Teammate', 'rowan@example.test']);

    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    expect(getTitles()).toEqual(['チームメンバー', 'Teammate', 'Teammate', 'rowan@example.test']);
  });
});
