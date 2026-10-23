// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import { rendererUiText, setRendererUiTranslator } from '../localWikiUiText';

afterEach(() => setRendererUiTranslator(null));

it('uses the renderer language translator and retains the fallback when unavailable', () => {
  expect(rendererUiText('dialogs', 'workspace.attach_folder_title', 'Attach Folder to Workspace'))
    .toBe('Attach Folder to Workspace');

  setRendererUiTranslator((namespace, key, fallback) =>
    namespace === 'dialogs' && key === 'workspace.attach_folder_title' ? 'ワークスペースにフォルダーを追加' : fallback,
  );
  expect(rendererUiText('dialogs', 'workspace.attach_folder_title', 'Attach Folder to Workspace'))
    .toBe('ワークスペースにフォルダーを追加');
});
