// @vitest-environment node
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { describe, expect, it } from 'vitest';
import { localizeHelpEntry } from '../HelpContent';
import { fileTreeTools } from '../../walkthroughs/definitions/file-tree-tools';
import { agentModeIntro, filesModeIntro } from '../../walkthroughs/definitions/navigation-intro';
import { resolveWalkthroughStepCopy } from '../../walkthroughs/resolveWalkthroughStepCopy';
import { attachFilesIntro } from '../../walkthroughs/definitions/attach-files-intro';
import { walkthroughs } from '../../walkthroughs/definitions';
import { HelpContent } from '../HelpContent';

describe('help display localization', () => {
  it('resolves every built-in guide title and body rather than falling back to its English snapshot', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options?: { defaultValue?: string }) =>
      i18n.t(key, { ns: 'common', defaultValue: options?.defaultValue });
    for (const guide of walkthroughs) {
      for (const step of guide.steps) {
        const copy = resolveWalkthroughStepCopy(guide.id, step, translate);
        expect(copy.title, `${guide.id}/${step.id} title`).not.toBe(step.title);
        expect(copy.body, `${guide.id}/${step.id} body`).not.toBe(step.body);
      }
    }
    for (const key of ['model-picker-provider-claude-code', 'model-picker-provider-claude-code-cli']) {
      await i18n.changeLanguage('en');
      const copy = localizeHelpEntry(key, HelpContent[key], translate);
      expect(copy.title).toBe(HelpContent[key].title);
      expect(copy.body).toBe(HelpContent[key].body);
    }
  });
  it('translates selector-targeted attachment guidance in both languages without changing its target', async () => {
    const i18n = await createI18nInstance('ja');
    const translate = (key: string, options?: { defaultValue?: string }) =>
      i18n.t(key, { ns: 'common', defaultValue: options?.defaultValue });
    const step = attachFilesIntro.steps[0];
    expect(step.target).toEqual({ selector: '.ai-chat-input' });
    expect(resolveWalkthroughStepCopy(attachFilesIntro.id, step, translate)).toEqual({
      title: 'ファイルと画像を添付',
      body: 'チャットにファイルをドラッグ＆ドロップしたり、画像を直接貼り付けたりできます。@を使ってプロジェクト内のファイルを指定することもできます。',
    });
    await i18n.changeLanguage('en');
    expect(resolveWalkthroughStepCopy(attachFilesIntro.id, step, translate)).toEqual({
      title: 'Attach Files & Images',
      body: step.body,
    });
    expect(step.title).toBe('Attach Files & Images');
  });
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
