// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { RelationshipFieldEditor } from '../../../../../runtime/src/plugins/TrackerPlugin/components/RelationshipFieldEditor';
import { TrackerFieldEditor } from '../../../../../runtime/src/plugins/TrackerPlugin/components/TrackerFieldEditor';
import { StatusBar } from '../../../../../runtime/src/plugins/TrackerPlugin/components/StatusBar';
import { TrackerRowContextMenu } from '../../../../../runtime/src/plugins/TrackerPlugin/components/TrackerRowContextMenu';
import type { FieldDefinition, TrackerDataModel } from '../../../../../runtime/src/plugins/TrackerPlugin/models/TrackerDataModel';

const locale = i18next.createInstance();

function translated(language: string, children: React.ReactNode) {
  const t = locale.getFixedT(language);
  return (
    <RuntimeTranslationProvider
      value={{
        locale: language,
        t: (key, defaultValue, params) => t(key, { ...params, defaultValue }),
      }}
    >
      {children}
    </RuntimeTranslationProvider>
  );
}

beforeEach(async () => {
  await locale.init({ lng: 'en', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const relationshipField: FieldDefinition = {
  name: 'dependsOn',
  type: 'relationship',
  relationshipTypeKey: 'relates-to',
  multiValue: true,
};

describe('shared tracker presentation localization', () => {
  it('localizes relationship controls while preserving values and callbacks', () => {
    const onChange = vi.fn();
    const view = render(translated('en', <RelationshipFieldEditor field={relationshipField} value={null} onChange={onChange} />));
    expect(screen.getByText('No links')).toBeTruthy();
    expect(screen.getByLabelText('Add link')).toBeTruthy();
    view.rerender(translated('ja', <RelationshipFieldEditor field={relationshipField} value={null} onChange={onChange} />));
    expect(screen.getByText('リンクはありません')).toBeTruthy();
    expect(screen.getByLabelText('リンクを追加')).toBeTruthy();
  });

  it('localizes field placeholders and URL actions without changing field values', () => {
    const requiredText: FieldDefinition = { name: 'summary', type: 'text', required: true };
    const view = render(translated('en', <TrackerFieldEditor field={requiredText} value="draft" onChange={vi.fn()} />));
    expect(screen.getByPlaceholderText('Required')).toBeTruthy();
    view.rerender(translated('ja', <TrackerFieldEditor field={requiredText} value="draft" onChange={vi.fn()} />));
    expect(screen.getByPlaceholderText('必須')).toBeTruthy();

    const urlField: FieldDefinition = { name: 'source', type: 'url' };
    view.rerender(translated('ja', <TrackerFieldEditor field={urlField} value={{ url: 'https://example.com' }} onChange={vi.fn()} />));
    expect(screen.getByTitle('リンクを開く')).toBeTruthy();
    expect(screen.getByPlaceholderText('表示ラベル（任意）')).toBeTruthy();
  });

  it('localizes status bar captions and context-menu fallbacks', () => {
    const model = { icon: 'task', displayName: 'Task', fields: [] } as unknown as TrackerDataModel;
    const view = render(translated('en', <StatusBar model={model} data={{ created: '2026-01-01T00:00:00Z', updated: '2026-01-02T00:00:00Z' }} onChange={vi.fn()} onClose={vi.fn()} />));
    expect(screen.getByText(/Created/)).toBeTruthy();
    view.rerender(translated('ja', <StatusBar model={model} data={{ created: '2026-01-01T00:00:00Z', updated: '2026-01-02T00:00:00Z' }} onChange={vi.fn()} onClose={vi.fn()} />));
    expect(screen.getByText(/作成:/)).toBeTruthy();
    expect(screen.getByLabelText('トラッカーを削除')).toBeTruthy();

    const refs = { setFloating: vi.fn() } as unknown as React.ComponentProps<typeof TrackerRowContextMenu>['refs'];
    view.rerender(translated('ja', <TrackerRowContextMenu
      anchor={new DOMRect(0, 0, 10, 10)}
      refs={refs}
      floatingStyles={{}}
      selectedIds={new Set(['item-1'])}
      activeTypeFilter="all"
      statusOptions={[]}
      onSetStatus={vi.fn()}
      onSetPriority={vi.fn()}
      closeContextMenu={vi.fn()}
      clearSelection={vi.fn()}
    />));
    expect(screen.getByText('1件を選択中')).toBeTruthy();
    expect(screen.getByText('ステータスを設定')).toBeTruthy();
    expect(screen.getByText('優先度を設定')).toBeTruthy();
  });
});
