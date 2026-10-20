import { describe, expect, it, vi } from 'vitest';
import { coordinateUiLanguageChange } from '../languageChangeCoordinator';

describe('coordinateUiLanguageChange', () => {
  it('rebuilds the application menu after the UI language changes', async () => {
    const changeLanguage = vi.fn().mockResolvedValue(true);
    const rebuildApplicationMenu = vi.fn().mockResolvedValue(undefined);

    await coordinateUiLanguageChange(
      'uiLanguage',
      changeLanguage,
      rebuildApplicationMenu,
    );

    expect(changeLanguage).toHaveBeenCalledOnce();
    expect(rebuildApplicationMenu).toHaveBeenCalledOnce();
  });

  it('does not rebuild the application menu when the effective language is unchanged', async () => {
    const changeLanguage = vi.fn().mockResolvedValue(false);
    const rebuildApplicationMenu = vi.fn().mockResolvedValue(undefined);

    await coordinateUiLanguageChange(
      'uiLanguage',
      changeLanguage,
      rebuildApplicationMenu,
    );

    expect(changeLanguage).toHaveBeenCalledOnce();
    expect(rebuildApplicationMenu).not.toHaveBeenCalled();
  });

  it('ignores settings unrelated to the UI language', async () => {
    const changeLanguage = vi.fn().mockResolvedValue(true);
    const rebuildApplicationMenu = vi.fn().mockResolvedValue(undefined);

    await coordinateUiLanguageChange(
      'theme',
      changeLanguage,
      rebuildApplicationMenu,
    );

    expect(changeLanguage).not.toHaveBeenCalled();
    expect(rebuildApplicationMenu).not.toHaveBeenCalled();
  });
});
