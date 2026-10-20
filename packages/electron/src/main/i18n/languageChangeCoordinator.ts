export async function coordinateUiLanguageChange(
  key: string,
  changeLanguage: () => Promise<boolean>,
  rebuildApplicationMenu: () => Promise<void>,
): Promise<void> {
  if (key !== 'uiLanguage') {
    return;
  }

  if (await changeLanguage()) {
    await rebuildApplicationMenu();
  }
}
