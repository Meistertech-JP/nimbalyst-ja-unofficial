import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '../../../shared/i18n/resources';
import { RuntimeTranslationProvider } from '../../../../../runtime/src/ui/RuntimeTranslation';
import { ContextLimitWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/ContextLimitWidget';
import { RateLimitWidget } from '../../../../../runtime/src/ui/AgentTranscript/components/RateLimitWidget';
import { ApiServiceErrorWidget, isApiServiceError, parseApiServiceError } from '../../../../../runtime/src/ui/AgentTranscript/components/ApiServiceErrorWidget';

const locale = i18next.createInstance();
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
function translated(children: React.ReactNode, language = 'ja') {
  const translate = locale.getFixedT(language);
  return <RuntimeTranslationProvider value={{ locale: language, t: (key, defaultValue, params) => translate(key, { ...params, defaultValue }) }}>{children}</RuntimeTranslationProvider>;
}
beforeEach(async () => {
  await locale.init({ lng: 'ja', fallbackLng: 'en', resources, interpolation: { escapeValue: false } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

describe('runtime transcript error localization', () => {
  it('keeps compaction pending across language changes without calling the action twice', () => {
    const onCompact = vi.fn();
    const widget = <ContextLimitWidget isLastMessage onCompact={onCompact} />;
    const view = render(translated(widget));
    expect(screen.getByText('コンテキストの上限を超えました')).toBeTruthy();
    const button = screen.getByRole('button', { name: '圧縮' }) as HTMLButtonElement;
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('圧縮中...');
    view.rerender(translated(widget, 'en'));
    expect(screen.getByRole('button', { name: 'Compacting...' })).toBe(button);
    fireEvent.click(button);
    expect(onCompact).toHaveBeenCalledTimes(1);
  });

  it('does not offer compaction for historical messages', () => {
    render(translated(<ContextLimitWidget />));
    expect(screen.getByText('この時点で会話がモデルのコンテキストウィンドウの上限を超えました。')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    [90, '1時間30分', '1h 30m'], [5, '5分', '5m'], [-1, 'まもなく', 'any moment now'],
  ])('localizes a reset %s minutes away without changing its calculation', (minutes, japanese, english) => {
    const now = 1800000000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const widget = <RateLimitWidget content={`<!-- [RATE_LIMIT_WARNING] limitType=5-hour session resetsAtUnix=${now / 1000 + minutes * 60} usage=91 -->`} />;
    const view = render(translated(widget));
    expect(screen.getByText('利用上限に近づいています')).toBeTruthy();
    expect(view.container.textContent).toContain(`5時間セッションの上限に対する利用状況: 91%。 リセットまで: ${japanese}。`);
    view.rerender(translated(widget, 'en'));
    expect(view.container.textContent).toContain(`You're at 91% of your 5-hour session limit. Resets in ${english}.`);
  });

  it('preserves unknown provider limit identifiers and the 1M plan warning condition', () => {
    const view = render(translated(<RateLimitWidget content="<!-- [RATE_LIMIT] limitType=custom_limit resetsAtUnix=unknown model=opus-1m -->" />));
    expect(view.container.textContent).toContain('custom_limitの利用上限に達しました。');
    expect(view.container.textContent).toContain('この1Mコンテキストモデル');
    view.rerender(translated(<RateLimitWidget content="<!-- [RATE_LIMIT_WARNING] limitType=usage usage=91 model=opus-1m -->" />));
    expect(view.container.textContent).not.toContain('この1Mコンテキストモデル');
  });

  it('localizes missing usage and limit information', () => {
    const view = render(translated(<RateLimitWidget content="[RATE_LIMIT_WARNING]" />));
    expect(view.container.textContent).toContain('使用量の上限に対する利用状況: 上限間近。');
  });

  it.each(['api_error', 'overloaded_error'])('keeps raw %s diagnostics, links and clipboard data intact', async (errorType) => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const raw = `API Error: 529 {"type":"error","error":{"type":"${errorType}","message":"Original diagnostic <unchanged>"},"request_id":"req_original1234"}`;
    const widget = <ApiServiceErrorWidget content={raw} />;
    const view = render(translated(widget));
    expect(screen.getByText(errorType === 'overloaded_error' ? 'Claude APIが一時的に混雑しています' : 'Claude APIで一時的なエラーが発生しました')).toBeTruthy();
    expect(view.container.querySelector('pre')!.textContent).toBe(raw);
    expect(screen.getByText(`HTTP 529 · ${errorType}`)).toBeTruthy();
    const link = screen.getByRole('link', { name: 'status.claude.com' });
    expect(link.getAttribute('href')).toBe('https://status.claude.com');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('エラーの原文を表示')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'コピー' })); });
    expect(writeText).toHaveBeenCalledWith('req_original1234');
    expect(screen.getByRole('button', { name: 'コピー済み' })).toBeTruthy();
    view.rerender(translated(widget, 'en'));
    expect(screen.getByRole('button', { name: 'copied' })).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole('button', { name: 'copy' })).toBeTruthy();
    expect(isApiServiceError(raw)).toBe(true);
    expect(parseApiServiceError(raw)).toMatchObject({ status: 529, errorType, requestId: 'req_original1234', raw });
  });

  it('does not invent a request ID when none is present', () => {
    render(translated(<ApiServiceErrorWidget content="API Error: 500" />));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('リクエストを再試行してください。一時的なapi_errorエラーは、通常、次の試行で解消します。')).toBeTruthy();
  });

  it('retains English defaults without the desktop provider', () => {
    const view = render(<><ContextLimitWidget isLastMessage /><RateLimitWidget content="[RATE_LIMIT]" /><ApiServiceErrorWidget content="API Error: 500" /></>);
    expect(screen.getByRole('button', { name: 'Compact' })).toBeTruthy();
    expect(view.container.textContent).toContain("You've hit your usage rate limit.");
    expect(screen.getByText('The Claude API returned a temporary error')).toBeTruthy();
  });
});
