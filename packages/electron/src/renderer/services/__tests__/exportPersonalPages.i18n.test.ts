// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { exportPersonalPagesToFiles } from '../exportPersonalPages';
import { setLocalWikiTranslator } from '../localWikiUiText';

const confirmation = vi.hoisted(() => vi.fn());
const notifications = vi.hoisted(() => ({ showError: vi.fn(), showInfo: vi.fn() }));
vi.mock('../../dialogs/requestConfirmation', () => ({ requestConfirmation: confirmation }));
vi.mock('../ErrorNotificationService', () => ({ errorNotificationService: notifications }));

afterEach(() => {
  setLocalWikiTranslator(null);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('personal page export localization', () => {
  it('translates the confirmation and completion notification while retaining the output path', async () => {
    const japanese = await createI18nInstance('ja');
    setLocalWikiTranslator((key, options) => japanese.t(key, { ns: 'common', ...options }));
    confirmation.mockResolvedValue(true);
    vi.stubGlobal('window', {
      electronAPI: {
        invoke: vi.fn().mockResolvedValue({
          ok: true,
          root: 'C:/project/wiki',
          exported: ['one', 'two'],
          alreadyInWiki: [],
          skipped: [{ id: 'three', title: 'Three', reason: 'unsupported' }],
          reparentedToRoot: [],
          itemPlacementsKept: [],
        }),
      },
    });

    await exportPersonalPagesToFiles('C:/project', 2);

    expect(confirmation).toHaveBeenCalledWith({
      title: 'ページをファイルにエクスポート',
      message: 'データベース内のページを、このプロジェクトのWikiフォルダーへMarkdownファイルとしてコピーします。データベース内のページは保持され、既存ファイルは上書きされません。',
      confirmLabel: 'エクスポート',
    });
    expect(notifications.showInfo).toHaveBeenCalledWith(
      'ページをエクスポートしました',
      '2件のページをC:/project/wikiにコピーしました。 Markdown以外のページ1件はデータベースに残しました。',
    );
  });
});
