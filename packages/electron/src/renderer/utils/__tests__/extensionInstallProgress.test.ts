import { afterEach, describe, expect, it } from 'vitest';
import i18next from 'i18next';
import { formatExtensionInstallProgress } from '../extensionInstallProgress';
import type { InstallProgressEvent } from '../../../shared/types/extensionInstallProgress';

describe('extension installation progress localization', () => {
  afterEach(async () => { await i18next.changeLanguage('en'); });

  it('translates each stage while preserving extension IDs, asset names, and release tags', async () => {
    await i18next.changeLanguage('ja');
    const events: Array<[InstallProgressEvent['messageKey'], string]> = [
      ['checking_release', 'リリースの配布ファイルを確認中...'],
      ['downloading_release', 'plugin.nimext（v1.2.3）をダウンロード中...'],
      ['cloning', 'リリースの配布ファイルが見つからないため、ソースをクローン中...'],
      ['installing', 'com.example.pluginをインストール中...'],
      ['installed_release', 'リリースv1.2.3からcom.example.pluginをインストールしました'],
      ['installed_source', 'ソースからcom.example.pluginをインストールしました'],
    ];
    for (const [messageKey, expected] of events) {
      expect(formatExtensionInstallProgress({
        stage: 'installing', message: 'Legacy progress', messageKey,
        messageParams: { assetName: 'plugin.nimext', releaseTag: 'v1.2.3', extensionId: 'com.example.plugin' },
      }, i18next.t)).toBe(expected);
    }
    await i18next.changeLanguage('en');
    expect(formatExtensionInstallProgress({
      stage: 'checking-release', message: 'Legacy progress', messageKey: 'checking_release',
    }, i18next.t)).toBe('Checking for release artifact...');
  });

  it('preserves legacy messages and unknown future translation keys', async () => {
    await i18next.changeLanguage('ja');
    const event: InstallProgressEvent = { stage: 'installing', message: 'External diagnostic' };
    expect(formatExtensionInstallProgress(event, i18next.t)).toBe('External diagnostic');
    expect(formatExtensionInstallProgress({
      ...event, messageKey: 'future_stage' as InstallProgressEvent['messageKey'],
    }, i18next.t)).toBe('External diagnostic');
  });
});
