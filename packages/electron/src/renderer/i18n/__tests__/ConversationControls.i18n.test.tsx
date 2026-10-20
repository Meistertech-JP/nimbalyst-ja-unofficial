import React, { useState } from 'react';
import i18next from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { AIInput, type AIInputProps } from '../../../../../runtime/src/ui/AIInput/AIInput';
import { MarkdownRenderer } from '../../../../../runtime/src/ui/AgentTranscript/components/MarkdownRenderer';
import { NotHandledBox } from '../../../../../runtime/src/ui/AgentTranscript/components/NotHandledBox';

const locale = i18next.createInstance();
const send = vi.fn();
const cancel = vi.fn();
const remove = vi.fn();
const attachment = { id: 'raw-id', filename: 'Raw filename.png', filepath: '/repo/raw.png', mimeType: 'image/png', size: 123, type: 'image' as const, addedAt: 1000 };
function localized(children: React.ReactNode, language = 'ja') {
  const t = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => t(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
function InputHarness(props: Partial<AIInputProps>) {
  const [value, setValue] = useState('  Raw message  ');
  return <AIInput value={value} onChange={setValue} onSend={send} attachments={[attachment]} onAttachmentRemove={remove} {...props} />;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
  send.mockReset(); cancel.mockReset(); remove.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('shared AI input captions and unchanged behavior', () => {
  it.each([false, true])('retains input, attachment identity and send payload in simpleMode=%s', simpleMode => {
    const view = render(localized(<InputHarness simpleMode={simpleMode} />, 'en'));
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(input.placeholder).toBe('Type your message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '  Draft /literal  ' } });
    view.rerender(localized(<InputHarness simpleMode={simpleMode} />));
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('  Draft /literal  ');
    expect(input.placeholder).toBe('メッセージを入力…（Enterで送信、Shift+Enterで改行）');
    expect(screen.getByText('Raw filename.png')).toBeTruthy();
    const sendButton = screen.getByRole('button', { name: locale.getFixedT('ja')('agents:input.send_message_aria') });
    expect(sendButton.getAttribute('title')).toBe(locale.getFixedT('ja')('agents:input.send_message'));
    fireEvent.click(sendButton);
    expect(send).toHaveBeenCalledExactlyOnceWith('  Draft /literal  ');
    fireEvent.click(screen.getByRole('button', { name: locale.getFixedT('ja')('aichat:attachments.remove') }));
    expect(remove).toHaveBeenCalledExactlyOnceWith('raw-id');
  });

  it.each(['Custom placeholder', ''])('preserves caller-provided placeholder: %j', placeholder => {
    const view = render(localized(<InputHarness placeholder={placeholder} />));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).placeholder).toBe(placeholder);
    view.rerender(localized(<InputHarness placeholder={placeholder} />, 'en'));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).placeholder).toBe(placeholder);
  });

  it('preserves Enter/Shift+Enter and empty/disabled send guards', () => {
    const view = render(localized(<InputHarness />));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(send).toHaveBeenCalledExactlyOnceWith('  Raw message  ');
    send.mockClear();
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((screen.getByRole('button', { name: locale.getFixedT('ja')('agents:input.send_message_aria') }) as HTMLButtonElement).disabled).toBe(true);
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'Draft' } });
    view.rerender(localized(<InputHarness disabled />));
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(send).not.toHaveBeenCalled();
    expect((input as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('translates cancellation title/ARIA and retains draft while loading', () => {
    const view = render(localized(<InputHarness isLoading onCancel={cancel} />, 'en'));
    const input = screen.getByRole('textbox');
    view.rerender(localized(<InputHarness isLoading onCancel={cancel} />));
    const button = screen.getByRole('button', { name: locale.getFixedT('ja')('agents:input.cancel_request_aria') });
    expect(button.getAttribute('title')).toBe(locale.getFixedT('ja')('agents:input.cancel_request_aria'));
    fireEvent.click(button);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBe(input);
    expect((input as HTMLTextAreaElement).value).toBe('  Raw message  ');
  });

  it('keeps the existing loading-without-cancel send behavior', () => {
    const view = render(localized(<InputHarness isLoading />));
    expect(view.container.querySelector('.ai-input-spinner')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: locale.getFixedT('ja')('agents:input.send_message_aria') }));
    expect(send).toHaveBeenCalledExactlyOnceWith('  Raw message  ');
  });
});

describe('Markdown wrap localization and durable block preference', () => {
  it.each(['', 'typescript'])('retains wrapping through locale switches, streaming and remounts (%s)', language => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) { this.callback([{ isIntersecting: true, target }] as IntersectionObserverEntry[], this as unknown as IntersectionObserver); }
      disconnect() {}
    });
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const messageId = `wrap-i18n-${language || 'plain'}`;
    const markdown = (extra = '') => <MarkdownRenderer messageId={messageId} content={'```' + language + '\nconst raw = 1;\nconst second = 2;' + extra + '\n```'} />;
    const view = render(localized(markdown(), 'en'));
    const wrap = screen.getByRole('checkbox', { name: 'Wrap' });
    fireEvent.click(wrap);
    view.rerender(localized(markdown()));
    expect((screen.getByRole('checkbox', { name: '折り返す' }) as HTMLInputElement).checked).toBe(true);
    view.rerender(localized(markdown('\nconst third = 3;')));
    expect((screen.getByRole('checkbox', { name: '折り返す' }) as HTMLInputElement).checked).toBe(true);
    expect(view.container.querySelector('.overflow-content')?.textContent).toContain('const third = 3;');
    view.unmount();
    const remounted = render(localized(markdown('\nconst third = 3;')));
    expect((screen.getByRole('checkbox', { name: '折り返す' }) as HTMLInputElement).checked).toBe(true);
    expect(remounted.container.querySelector('.word-wrap-enabled')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: '折り返す' }));
    expect(remounted.container.querySelector('.word-wrap-enabled')).toBeNull();
  });

  it('translates only the unsupported-output badge, preserving type and description', () => {
    const child = <NotHandledBox type="Raw future type" description="Original provider text" />;
    const view = render(localized(child, 'en'));
    expect(screen.getByText('Not Handled')).toBeTruthy();
    view.rerender(localized(child));
    expect(screen.getByText('未対応')).toBeTruthy();
    expect(screen.getByText('Raw future type')).toBeTruthy();
    expect(screen.getByText('Original provider text')).toBeTruthy();
  });
});
