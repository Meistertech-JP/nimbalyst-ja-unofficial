import React, { createRef } from 'react';
import i18next from 'i18next';
import { createEditor } from 'lexical';
import { calculateZoomLevel } from '@lexical/utils';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { VirtualDocumentBanner } from '../../../../../runtime/src/components/VirtualDocumentBanner';
import ThemeToggle from '../../../../../runtime/src/editor/ui/ThemeToggle';
import Modal from '../../../../../runtime/src/editor/ui/Modal';
import ImageResizer from '../../../../../runtime/src/editor/ui/ImageResizer';

const locale = i18next.createInstance();
let originalTheme: string | null;
let originalClass: string;
let originalBodyStyle: string | null;
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  originalTheme = document.documentElement.getAttribute('data-theme');
  originalClass = document.documentElement.className;
  originalBodyStyle = document.body.getAttribute('style');
});
afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  if (originalTheme === null) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', originalTheme);
  document.documentElement.className = originalClass;
  if (originalBodyStyle === null) document.body.removeAttribute('style');
  else document.body.setAttribute('style', originalBodyStyle);
});

describe('shared editor primitive localization', () => {
  it('translates the read-only banner and optional dismissal without changing callbacks', () => {
    const dismiss = vi.fn();
    const view = render(localized(<VirtualDocumentBanner onDismiss={dismiss} />, 'en'));
    expect(screen.getByText('This is a read-only welcome document. Changes will not be saved.')).toBeTruthy();
    view.rerender(localized(<VirtualDocumentBanner onDismiss={dismiss} />));
    expect(screen.getByText('このウェルカムドキュメントは読み取り専用です。変更は保存されません。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: locale.getFixedT('ja')('common:dismiss') }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    view.rerender(localized(<VirtualDocumentBanner />));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each(['light', 'dark', 'crystal-dark'])('translates %s theme titles while retaining current upstream no-op behavior', theme => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.className = '';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = render(localized(<ThemeToggle className="custom-class" />, 'en'));
    expect(screen.getByRole('button').getAttribute('title')).toBe(theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    view.rerender(localized(<ThemeToggle className="custom-class" />));
    const button = screen.getByRole('button', { name: theme === 'light' ? 'ダークモードに切り替える' : 'ライトモードに切り替える' });
    expect(button.getAttribute('title')).toBe(button.getAttribute('aria-label'));
    expect(button.classList.contains('custom-class')).toBe(true);
    expect(button.textContent).toBe(theme === 'light' ? '🌙' : '☀️');
    fireEvent.click(button);
    expect(warn).toHaveBeenCalledWith('[rexical] toggleTheme is deprecated - theme is controlled at app level');
    expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
  });

  it('updates the translated toggle when the host changes theme', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.className = '';
    render(localized(<ThemeToggle />));
    expect(screen.getByRole('button', { name: 'ダークモードに切り替える' })).toBeTruthy();
    await act(async () => document.documentElement.setAttribute('data-theme', 'dark'));
    expect(screen.getByRole('button', { name: 'ライトモードに切り替える' })).toBeTruthy();
  });

  it.each([false, true])('keeps portal state, close controls, Escape and outside-click policy (%s)', closeOnClickOutside => {
    const close = vi.fn();
    const child = <Modal title="Raw modal title" onClose={close} closeOnClickOutside={closeOnClickOutside}><input aria-label="Raw input" defaultValue="Original content" /></Modal>;
    const view = render(localized(child, 'en'));
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeTruthy();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Retained draft' } });
    view.rerender(localized(child));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('Retained draft');
    expect(screen.getByText('Raw modal title')).toBeTruthy();
    fireEvent.click(screen.getByRole('dialog'));
    expect(close).toHaveBeenCalledTimes(closeOnClickOutside ? 1 : 0);
    close.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'モーダルを閉じる' }));
    expect(close).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(2);
    view.unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('keeps the nearest editor portal destination through a language switch', () => {
    const view = render(<div className="nimbalyst-editor"><button>Raw anchor</button></div>);
    screen.getByRole('button', { name: 'Raw anchor' }).focus();
    const child = <Modal title="Raw title" onClose={() => {}}>Raw content</Modal>;
    const modal = render(localized(child, 'en'));
    const dialog = screen.getByRole('dialog');
    expect(view.container.querySelector('.nimbalyst-editor')?.contains(dialog)).toBe(true);
    modal.rerender(localized(child));
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.getByText('Raw content')).toBeTruthy();
  });

  it('translates caption controls and preserves an in-progress image resize across languages', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    const editor = createEditor({ namespace: 'image-resizer-i18n', onError: error => { throw error; } });
    const image = document.createElement('img');
    // jsdom drops CSS zoom, including explicit values. Supply the browser's default only at this platform boundary.
    const getStyleProperty = CSSStyleDeclaration.prototype.getPropertyValue;
    vi.spyOn(CSSStyleDeclaration.prototype, 'getPropertyValue').mockImplementation(function (this: CSSStyleDeclaration, property) {
      return property === 'zoom' ? '1' : getStyleProperty.call(this, property);
    });
    expect(calculateZoomLevel(image)).toBe(1);
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 100, x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 100, toJSON: () => ({}) });
    const onResizeStart = vi.fn();
    const onResizeEnd = vi.fn();
    const setShowCaption = vi.fn();
    const props = { editor, buttonRef: createRef<HTMLButtonElement>(), imageRef: { current: image }, maxWidth: 300, onResizeStart, onResizeEnd, setShowCaption, showCaption: false, captionsEnabled: true };
    const view = render(localized(<ImageResizer {...props} />, 'en'));
    expect(screen.getByRole('button', { name: 'Add Caption' })).toBeTruthy();
    fireEvent(view.container.querySelector('.image-resizer-e')!, new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    view.rerender(localized(<ImageResizer {...props} />));
    fireEvent(document, new MouseEvent('pointermove', { bubbles: true, clientX: 60, clientY: 10 }));
    fireEvent(document, new MouseEvent('pointerup', { bubbles: true }));
    expect(onResizeEnd).toHaveBeenCalledExactlyOnceWith(250, 100);
    expect(image.style.width).toBe('250px');
    fireEvent.click(screen.getByRole('button', { name: 'キャプションを追加' }));
    expect(setShowCaption).toHaveBeenCalledExactlyOnceWith(true);
    view.rerender(localized(<ImageResizer {...props} showCaption />));
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(localized(<ImageResizer {...props} captionsEnabled={false} />));
    expect(screen.queryByRole('button')).toBeNull();
    expect(view.container.querySelectorAll('.image-resizer')).toHaveLength(8);
  });
});
