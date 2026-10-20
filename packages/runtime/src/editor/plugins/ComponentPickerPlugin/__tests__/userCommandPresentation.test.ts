import { describe, expect, it } from 'vitest';

import type { RuntimeTranslate } from '../../../../ui/RuntimeTranslation';
import { getUserCommandTitle } from '../userCommandPresentation';

const translate: RuntimeTranslate = (key, defaultValue) =>
  key === 'editor:mockup.template_title' ? 'モックアップ' : defaultValue;

describe('getUserCommandTitle', () => {
  it('uses the host translation for a contributed command title', () => {
    expect(
      getUserCommandTitle(
        { title: 'Mockup', titleTranslationKey: 'editor:mockup.template_title' },
        translate,
      ),
    ).toBe('モックアップ');
  });

  it('preserves the default title when no translation key is provided', () => {
    expect(getUserCommandTitle({ title: 'Custom command' }, translate)).toBe('Custom command');
  });
});
