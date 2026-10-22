// @vitest-environment node
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { describe, expect, it } from 'vitest';
import { localizeHelpEntry } from '../HelpContent';
import { fileTreeTools } from '../../walkthroughs/definitions/file-tree-tools';
import { agentModeIntro, filesModeIntro } from '../../walkthroughs/definitions/navigation-intro';
import { resolveWalkthroughStepCopy } from '../../walkthroughs/resolveWalkthroughStepCopy';

describe('help display localization', () => {
  it('translates help-backed walkthrough steps without changing the English registry snapshot', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options?: { defaultValue?: string }) =>
      i18n.t(key, { ns: 'common', defaultValue: options?.defaultValue });
    const step = fileTreeTools.steps[0];

    expect(step.title).toBe('Filter Your File Tree');
    expect(resolveWalkthroughStepCopy(fileTreeTools.id, step, translate)).toEqual({
      title: 'ファイルツリーを絞り込む',
      body: 'Markdownファイル、未コミットのGit変更、またはこのセッションでAIが読み書きしたファイルだけを表示します。',
    });
  });

  it('keeps the longer navigation intro instead of the shorter mode tooltip', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options?: { defaultValue?: string }) =>
      i18n.t(key, { ns: 'common', defaultValue: options?.defaultValue });

    expect(resolveWalkthroughStepCopy(agentModeIntro.id, agentModeIntro.steps[0], translate).body)
      .toContain('カンバンボード');
    expect(resolveWalkthroughStepCopy(filesModeIntro.id, filesModeIntro.steps[0], translate).title)
      .toBe('ファイルモード');
  });

  it('leaves manifest help in its source language when no resource exists', () => {
    const entry = { title: 'Extension panel', body: 'From the manifest' };
    expect(localizeHelpEntry('extension-panel-custom', entry, (_key, options) => options?.defaultValue ?? _key))
      .toEqual(entry);
  });

  it('formats walkthrough progress from the active locale', async () => {
    const japanese = await createI18nInstance('ja');
    const english = await createI18nInstance('en');
    expect(japanese.t('walkthrough.progress', { ns: 'common', current: 1, total: 2 })).toBe('1 / 2');
    expect(english.t('walkthrough.progress', { ns: 'common', current: 1, total: 2 })).toBe('1 of 2');
  });
});
