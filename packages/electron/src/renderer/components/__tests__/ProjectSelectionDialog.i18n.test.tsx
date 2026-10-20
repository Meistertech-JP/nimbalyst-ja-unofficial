// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProjectSelectionDialog } from '../ProjectSelectionDialog/ProjectSelectionDialog';

afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await i18next.changeLanguage('en'); });

it('translates native creation labels without changing folder selection, paths, or browse behavior', async () => {
  const invoke = vi.fn(async (channel: string) => channel === 'get-recent-workspaces' ? [] : { canceled: false, filePaths: ['F:/User project'] });
  vi.stubGlobal('electronAPI', { invoke });
  const onSelectProject = vi.fn();
  await i18next.changeLanguage('ja');
  await act(async () => render(<ProjectSelectionDialog isOpen fileName="User.md" onSelectProject={onSelectProject} onCancel={vi.fn()} />));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '新しいプロジェクトを作成…' })));
  expect(invoke).toHaveBeenLastCalledWith('dialog-show-open-dialog', {
    properties: ['openDirectory', 'createDirectory'], title: '新しいプロジェクトを作成', buttonLabel: 'プロジェクトを作成',
  });
  expect(onSelectProject).toHaveBeenLastCalledWith('F:/User project');
  await act(() => i18next.changeLanguage('en'));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Create New Project...' })));
  expect(invoke).toHaveBeenLastCalledWith('dialog-show-open-dialog', {
    properties: ['openDirectory', 'createDirectory'], title: 'Create New Project', buttonLabel: 'Create Project',
  });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Browse for Project...' })));
  expect(invoke).toHaveBeenLastCalledWith('dialog-show-open-dialog', { properties: ['openDirectory', 'createDirectory'] });
  expect(invoke.mock.calls.filter(([channel]) => channel === 'get-recent-workspaces')).toHaveLength(1);
});
