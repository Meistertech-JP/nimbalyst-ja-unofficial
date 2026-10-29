import React from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualDisplayWidget } from '../VisualDisplayWidget';

describe('VisualDisplayWidget', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let boundingClientRectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    boundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600,
      height: 300,
      top: 0,
      right: 600,
      bottom: 300,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    boundingClientRectSpy.mockRestore();
  });

  it('does not warn about invalid chart dimensions before the container is measured', () => {
    render(
      <VisualDisplayWidget
        message={{
          toolCall: {
            toolName: 'display_to_user',
            arguments: {
              items: [{
                description: 'Example chart',
                chart: {
                  chartType: 'bar',
                  data: [{ category: 'A', value: 1 }],
                  xAxisKey: 'category',
                  yAxisKey: 'value',
                },
              }],
            },
          },
        } as any}
        isExpanded={true}
        onToggle={() => {}}
        sessionId="session-1"
      />
    );

    const invalidSizeWarning = consoleWarnSpy.mock.calls.find((call: unknown[]) => {
      const message: unknown = call[0];
      return typeof message === 'string'
        && message.includes('The width(')
        && message.includes('of chart should be greater than 0');
    });
    expect(invalidSizeWarning).toBeUndefined();
  });

  it.each(['future-chart', '__proto__'])('does not translate an unknown chart identifier %s', async (chartType) => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'en', fallbackLng: 'en',
      resources: { en: { aichat: { visual: { chart_description: '{{chart}}: {{description}}' } } } },
    });
    const translate = vi.spyOn(i18n, 't');
    try {
      const view = render(
        <I18nextProvider i18n={i18n}>
          <VisualDisplayWidget
            message={{ toolCall: { toolName: 'display_to_user', arguments: { items: [{
              description: 'Unknown chart fixture',
              chart: { chartType, data: [{ category: 'A', value: 1 }], xAxisKey: 'category', yAxisKey: 'value' },
            }] } } } as any}
            isExpanded={true}
            onToggle={() => {}}
            sessionId="unknown-chart-session"
          />
        </I18nextProvider>,
      );
      expect(translate).toHaveBeenCalled();
      expect(translate.mock.calls.some(([key]) => key === undefined || typeof key !== 'string')).toBe(false);
      expect(view.getByRole('img', { name: `${chartType}: Unknown chart fixture` })).toBeTruthy();
    } finally {
      translate.mockRestore();
    }
  });

  it('renders inline synced bytes instead of the unreachable desktop path (no readFile, as on iOS)', async () => {
    const { findByAltText } = render(
      <VisualDisplayWidget
        message={{
          toolCall: {
            toolName: 'mcp__nimbalyst__display_to_user',
            arguments: {
              items: [{
                description: 'Profile screen',
                image: { path: '/Users/me/shot.png', data: 'QUJD', mimeType: 'image/jpeg' },
              }],
            },
          },
        } as any}
        isExpanded={true}
        onToggle={() => {}}
        sessionId="session-1"
      />
    );

    const img = await findByAltText('Profile screen');
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,QUJD');
  });
});
