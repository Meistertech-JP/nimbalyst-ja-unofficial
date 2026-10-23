// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { OrgProjectsSidebarSection, type OrgProjectLocalState } from '../OrgProjectsSidebarSection';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));
vi.mock('../../../help', () => ({
  HelpTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function render(node: React.ReactNode) {
  return renderWithLanguage(node, englishI18n, 'en');
}

function renderWithLanguage(
  node: React.ReactNode,
  i18n: Awaited<ReturnType<typeof createI18nInstance>>,
  preference: 'en' | 'ja',
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return rtlRender(node, { wrapper: Wrapper });
}

function project(overrides: Partial<OrgProjectLocalState> = {}): OrgProjectLocalState {
  return {
    projectId: 'p-1',
    teamProjectId: 'tp-1',
    name: 'Notes',
    slug: 'notes',
    gitRemoteHash: null,
    localStatus: 'notLocal',
    workspacePath: null,
    ...overrides,
  };
}

function renderSection(projects: OrgProjectLocalState[]) {
  const onReload = vi.fn();
  render(
    <OrgProjectsSidebarSection
      orgId="org-1"
      projects={projects}
      loading={false}
      error={null}
      onReload={onReload}
    />,
  );
  return { onReload };
}

describe('OrgProjectsSidebarSection', () => {
  afterEach(() => {
    cleanup();
    delete (window as any).electronAPI;
  });

  // A project with no git remote has nothing to match this machine by, so
  // opening it means choosing the folder it should live in.
  it('attaches a chosen folder to a project that has no git remote', async () => {
    const openSharedProject = vi.fn(async () => ({ success: true }));
    (window as any).electronAPI = {
      invoke: vi.fn(async () => ({ canceled: false, filePaths: ['/projects/notes'] })),
      team: { openSharedProject, openProjectWorkspace: vi.fn() },
    };
    const { onReload } = renderSection([project()]);

    fireEvent.click(screen.getByTestId('org-projects-sidebar-row'));

    await waitFor(() => expect(openSharedProject).toHaveBeenCalledWith({
      orgId: 'org-1',
      teamProjectId: 'tp-1',
      directoryPath: '/projects/notes',
    }));
    await waitFor(() => expect(onReload).toHaveBeenCalled());
  });

  it('does not attach anything when the folder picker is dismissed', async () => {
    const openSharedProject = vi.fn();
    (window as any).electronAPI = {
      invoke: vi.fn(async () => ({ canceled: true, filePaths: [] })),
      team: { openSharedProject, openProjectWorkspace: vi.fn() },
    };
    renderSection([project()]);

    fireEvent.click(screen.getByTestId('org-projects-sidebar-row'));

    await waitFor(() => expect((window as any).electronAPI.invoke).toHaveBeenCalled());
    expect(openSharedProject).not.toHaveBeenCalled();
  });

  it('surfaces the reason a folder was rejected', async () => {
    (window as any).electronAPI = {
      invoke: vi.fn(async () => ({ canceled: false, filePaths: ['/projects/taken'] })),
      team: {
        openSharedProject: vi.fn(async () => ({
          success: false,
          error: 'That folder already belongs to a different project',
        })),
        openProjectWorkspace: vi.fn(),
      },
    };
    renderSection([project()]);

    fireEvent.click(screen.getByTestId('org-projects-sidebar-row'));

    await waitFor(() => expect(
      screen.getByTestId('org-projects-sidebar-open-error').textContent,
    ).toContain('different project'));
  });

  it.each([undefined, 'Server detail: folder is already linked'])('keeps an open failure reactive to locale while preserving external detail %s', async (detail) => {
    const i18n = await createI18nInstance('en');
    const openSharedProject = vi.fn(async () => ({ success: false, error: detail }));
    (window as any).electronAPI = {
      invoke: vi.fn(async () => ({ canceled: false, filePaths: ['/projects/notes'] })),
      team: { openSharedProject, openProjectWorkspace: vi.fn() },
    };
    const onReload = vi.fn();
    rtlRender(
      <I18nextProvider i18n={i18n}>
        <OrgProjectsSidebarSection orgId="org-1" projects={[project()]} loading={false} error={null} onReload={onReload} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByTestId('org-projects-sidebar-row'));
    await waitFor(() => expect(screen.getByTestId('org-projects-sidebar-open-error').textContent)
      .toBe(detail ?? 'Could not open that project'));
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.getByTestId('org-projects-sidebar-open-error').textContent)
      .toBe(detail ?? 'このプロジェクトを開けませんでした');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByTestId('org-projects-sidebar-open-error').textContent)
      .toBe(detail ?? 'Could not open that project');
    expect(openSharedProject).toHaveBeenCalledTimes(1);
    expect(onReload).not.toHaveBeenCalled();
  });

  // Binding an arbitrary folder to a repo-backed project would give it two
  // answers: the remote match and the binding. Cloning is the only way in.
  it('leaves a repo-backed project that is not on this machine disabled', () => {
    (window as any).electronAPI = {
      invoke: vi.fn(),
      team: { openSharedProject: vi.fn(), openProjectWorkspace: vi.fn() },
    };
    renderSection([project({ gitRemoteHash: 'hash-widgets' })]);

    const row = screen.getByTestId('org-projects-sidebar-row') as HTMLButtonElement;
    expect(row.disabled).toBe(true);

    fireEvent.click(row);
    expect((window as any).electronAPI.invoke).not.toHaveBeenCalled();
  });

  it('opens a project that is already on this machine without asking for a folder', () => {
    const openProjectWorkspace = vi.fn(async () => ({ success: true }));
    (window as any).electronAPI = {
      invoke: vi.fn(),
      team: { openSharedProject: vi.fn(), openProjectWorkspace },
    };
    renderSection([project({ localStatus: 'closed', workspacePath: '/projects/notes' })]);

    fireEvent.click(screen.getByTestId('org-projects-sidebar-row'));

    expect(openProjectWorkspace).toHaveBeenCalledWith('/projects/notes');
    expect((window as any).electronAPI.invoke).not.toHaveBeenCalled();
  });

  it('renders project status and folder picker labels in Japanese', async () => {
    const invoke = vi.fn(async () => ({ canceled: true, filePaths: [] }));
    (window as any).electronAPI = {
      invoke,
      team: { openSharedProject: vi.fn(), openProjectWorkspace: vi.fn() },
    };
    const onReload = vi.fn();
    renderWithLanguage(
      <OrgProjectsSidebarSection
        orgId="org-1"
        projects={[project(), project({ projectId: 'p-2', name: 'Repo', gitRemoteHash: 'hash' })]}
        loading={false}
        error={null}
        onReload={onReload}
      />,
      japaneseI18n,
      'ja',
    );

    expect(screen.getByTestId('org-projects-sidebar-section').textContent).toContain('プロジェクト');
    expect(screen.getAllByTestId('org-projects-sidebar-row')[0].textContent).toContain('ローカルで開く');
    expect((screen.getAllByTestId('org-projects-sidebar-row')[1] as HTMLButtonElement).title)
      .toBe('このプロジェクトのリポジトリをクローンしてから、開いてここで作業してください。');
    fireEvent.click(screen.getAllByTestId('org-projects-sidebar-row')[0]);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('dialog:openDirectory', {
      title: 'Notesのフォルダーを選択',
      buttonLabel: 'プロジェクトを開く',
    }));
  });
});
