// @vitest-environment jsdom
/**
 * The typed page layout runs without the desktop: the host hands it the item,
 * crumb and field values, a body to render and a links source.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { globalRegistry, type TrackerDataModel } from '@nimbalyst/tracker-schema';
import { parseBuiltinTrackers } from '@nimbalyst/runtime/plugins/TrackerPlugin/models/ModelLoader';
import type { TrackerRecord } from '@nimbalyst/runtime/core/TrackerRecord';
import { TrackerPageView } from '../TrackerPageView';
import { PlainPageHeader } from '../PlainPageHeader';
import { PagesSectionEntries } from '../../../docs-ui/PagesSectionEntries';

const MODULE = {
  type: 'tpv-module', displayName: 'Module', displayNamePlural: 'Modules', icon: 'widgets', color: '#888',
  modes: { inline: false, fullDocument: true }, idPrefix: 'mod', idFormat: 'ulid',
  fields: [{ name: 'title', type: 'string' }],
} as unknown as TrackerDataModel;

const item = {
  id: 'mod_1', primaryType: 'tpv-module', typeTags: [], issueKey: 'MOD-1', archived: false, source: 'native',
  fields: { title: 'Sync engine' }, fieldUpdatedAt: {}, system: {},
} as unknown as TrackerRecord;

const testI18n = createInstance();
const testI18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

function renderWithI18n(ui: React.ReactNode) {
  return render(ui, { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> });
}

beforeAll(async () => {
  await testI18nReady;
  globalRegistry.register(MODULE);
});
beforeEach(async () => { await testI18n.changeLanguage('en'); });
afterAll(() => globalRegistry.unregister('tpv-module'));

describe('TrackerPageView', () => {
  it('localizes the builtin type crumb while preserving the item title', async () => {
    const task = parseBuiltinTrackers().find(model => model.type === 'task')!;
    globalRegistry.register(task, true);
    const builtinItem = { ...item, id: 'builtin-page', primaryType: 'task', fields: { title: 'User title' } } as TrackerRecord;
    const { container } = renderWithI18n(
      <TrackerPageView item={builtinItem} loaded crumb={{ ancestors: [], underType: true }} editable={false}
        title="User title" onRename={vi.fn()} fieldValues={builtinItem.fields} onUpdateField={vi.fn()} renderBody={() => null} />,
    );
    for (const language of ['ja', 'en', 'ja']) {
      await act(async () => { await testI18n.changeLanguage(language); });
      expect(container.querySelector('.tracker-page-view-crumb')?.textContent).toContain(language === 'ja' ? 'タスク' : 'Task');
      expect(container.querySelector('h1')?.textContent).toBe('User title');
    }
    expect(builtinItem.primaryType).toBe('task');
  });

  it('updates rendered page timestamp facts on live language switching', async () => {
    const datedItem: TrackerRecord = {
      ...item,
      system: { ...item.system, updatedAt: new Date(Date.now() - 3 * 3_600_000).toISOString() },
    };
    const { container } = renderWithI18n(
      <TrackerPageView
        item={datedItem} loaded crumb={{ ancestors: [], underType: false }} editable title="Sync engine"
        onRename={vi.fn()} fieldValues={item.fields} onUpdateField={vi.fn()} renderBody={() => null}
        headerBar={{}}
      />,
    );
    const fact = () => container.querySelector('[data-fact="updated"]');
    expect(fact()?.textContent).toContain('Updated');
    expect(fact()?.textContent).toContain('3h ago');
    await act(async () => { await testI18n.changeLanguage('ja'); });
    expect(fact()?.textContent).toContain('更新日');
    expect(fact()?.textContent).toContain('3時間前');
    expect(fact()?.getAttribute('title')).toBe(new Date(datedItem.system.updatedAt).toLocaleString('ja'));
    await act(async () => { await testI18n.changeLanguage('en'); });
    expect(fact()?.textContent).toContain('Updated');
    expect(fact()?.textContent).toContain('3h ago');
  });

  it('localizes page history, archive, and the editable-title placeholder', async () => {
    await testI18n.changeLanguage('ja');
    renderWithI18n(
      <TrackerPageView
        item={item} loaded crumb={{ ancestors: [], underType: false }} editable title="Sync engine"
        onRename={vi.fn()} fieldValues={item.fields} onUpdateField={vi.fn()} renderBody={() => null} onArchive={vi.fn()}
        onShowHistory={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'ページの履歴' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ページをアーカイブ' })).toBeDefined();
    expect((screen.getByTestId('tracker-page-title') as HTMLTextAreaElement).placeholder).toBe('無題');
    fireEvent.click(screen.getByRole('button', { name: 'ページをアーカイブ' }));
    const dialog = await screen.findByTestId('collab-confirm-dialog');
    expect(dialog.querySelector('.collab-confirm-cancel')?.textContent).toBe('キャンセル');
    fireEvent.click(dialog.querySelector('.collab-confirm-cancel')!);
  });

  it('localizes the plain page title fallback and type-chip label and tooltip', async () => {
    await testI18n.changeLanguage('ja');
    renderWithI18n(
      <PlainPageHeader title="" editable={false} onSetType={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: '無題' })).toBeDefined();
    const pageType = screen.getByTestId('plain-page-type');
    expect(pageType.textContent).toContain('ページ');
    expect(pageType.getAttribute('title')).toBe('ページ。クリックしてタイプを変更します。');
  });

  it('localizes Pages section navigation while keeping its open actions intact', async () => {
    await testI18n.changeLanguage('ja');
    const onOpenHome = vi.fn();
    renderWithI18n(
      <PagesSectionEntries
        active="home"
        onOpenHome={onOpenHome}
        onOpenSearch={vi.fn()}
        onOpenTypes={vi.fn()}
      />,
    );

    const group = screen.getByRole('group', { name: 'セクション' });
    const home = group.querySelector('[data-entry="home"]') as HTMLButtonElement;
    expect(home.textContent).toContain('ホーム');
    expect(group.textContent).toContain('検索');
    expect(group.textContent).toContain('種類');
    fireEvent.click(home);
    expect(onOpenHome).toHaveBeenCalledWith({ newTab: false });
  });

  it('lays out crumb, title, body and links from host-supplied pieces', async () => {
    expect((window as { electronAPI?: unknown }).electronAPI).toBeUndefined();
    const onRename = vi.fn();
    const onShowHistory = vi.fn();
    const linksFor = vi.fn().mockResolvedValue([{
      direction: 'out', otherItemId: 'mod_2', otherTitle: 'Storage', otherIssueKey: 'MOD-2', otherTypeId: 'tpv-module',
      predicateId: null, relationshipTypeKey: null, sentence: 'Writes go to Storage.', sourceFieldId: 'body:link',
    }]);

    renderWithI18n(
      <TrackerPageView
        item={item}
        loaded
        crumb={{ section: 'Personal', ancestors: ['Architecture'], underType: true }}
        editable
        title="Sync engine"
        onRename={onRename}
        fieldValues={item.fields}
        onUpdateField={vi.fn()}
        renderBody={() => <p>Body from the host</p>}
        linksSource={{ linksFor }}
        onShowHistory={onShowHistory}
      />,
    );

    expect(screen.getByTestId('tracker-page-crumb').textContent).toBe('Personal / Architecture / Module / Sync engine');
    screen.getByText('Body from the host');
    await screen.findByText('Mentions');
    expect(linksFor).toHaveBeenCalledWith('mod_1');

    fireEvent.change(screen.getByTestId('tracker-page-title'), { target: { value: 'Sync\nengine v2' } });
    expect(onRename).toHaveBeenCalledWith('Sync engine v2');

    // Agent edits land directly, so the body's history is how one is reverted.
    fireEvent.click(screen.getByRole('button', { name: 'Page history' }));
    expect(onShowHistory).toHaveBeenCalledOnce();
  });

  it('archives the typed page from its header only after the in-app confirm, then says it is archived', async () => {
    const onArchive = vi.fn();
    const page = (record: TrackerRecord) => (
      <TrackerPageView
        item={record} loaded crumb={{ ancestors: [], underType: false }} editable title="Sync engine"
        onRename={vi.fn()} fieldValues={record.fields} onUpdateField={vi.fn()} renderBody={() => null} onArchive={onArchive}
      />
    );
    const { rerender } = renderWithI18n(page(item));
    fireEvent.click(screen.getByRole('button', { name: 'Archive page' }));
    const dialog = await screen.findByTestId('collab-confirm-dialog');
    expect(onArchive).not.toHaveBeenCalled();
    fireEvent.click(dialog.querySelector('.collab-confirm-accept')!);
    await waitFor(() => expect(onArchive).toHaveBeenCalledOnce());

    rerender(page({ ...item, archived: true } as TrackerRecord));
    expect(screen.queryByRole('button', { name: 'Archive page' })).toBeNull();
    screen.getByText('Archived');
    cleanup();
  });

  it('in the header strip, opens each page above it and keeps Archive behind the menu', async () => {
    const onOpenAncestor = vi.fn();
    const onArchive = vi.fn();
    const onShowHistory = vi.fn();
    renderWithI18n(
      <TrackerPageView
        item={item} loaded editable title="Sync engine"
        crumb={{
          ancestors: ['Architecture'], underType: true,
          path: [{ id: 'arch', kind: 'page', name: 'Architecture' }, { id: 'tpv-module', kind: 'type', name: 'Modules' }],
        }}
        onRename={vi.fn()} fieldValues={item.fields} onUpdateField={vi.fn()} renderBody={() => null}
        onShowHistory={onShowHistory} onArchive={onArchive} headerBar={{ onOpenAncestor }}
      />,
    );

    expect(screen.queryByTestId('tracker-page-crumb')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modules' }));
    expect(onOpenAncestor).toHaveBeenCalledWith(expect.objectContaining({ id: 'tpv-module', kind: 'type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page history' }));
    expect(onShowHistory).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByTestId('page-header-menu-archive'));
    fireEvent.click((await screen.findByTestId('collab-confirm-dialog')).querySelector('.collab-confirm-accept')!);
    await waitFor(() => expect(onArchive).toHaveBeenCalledOnce());
    cleanup();
  });
});

describe('PlainPageHeader', () => {
  it('renames on Enter only when the title changed, and Escape puts the title back', () => {
    const onRename = vi.fn();
    const onSetType = vi.fn();
    renderWithI18n(<PlainPageHeader title="Product" editable onRename={onRename} onSetType={onSetType} onUpdateField={vi.fn()} />);
    const title = screen.getByTestId('plain-page-title') as HTMLTextAreaElement;

    fireEvent.focus(title);
    fireEvent.keyDown(title, { key: 'Enter' });
    fireEvent.blur(title);
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: 'Draft' } });
    fireEvent.keyDown(title, { key: 'Escape' });
    expect(title.value).toBe('Product');

    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: 'Product areas ' } });
    fireEvent.blur(title);
    expect(onRename).toHaveBeenCalledExactlyOnceWith('Product areas');

    // A plain page's type chip changes its type; its "+" offers its own fields.
    fireEvent.click(screen.getByTestId('plain-page-type'));
    expect(onSetType).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(Array.from(screen.getByTestId('plain-page-add-field-menu').querySelectorAll('[role="menuitem"]'))
      .map((entry) => entry.getAttribute('data-field'))).toEqual(['status', 'owner', 'summary']);
    cleanup();
  });
});
