import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CanvasCardNode } from '../CanvasCardNode';
import { CanvasToolRail } from '../CanvasToolRail';
import { CanvasZoomWidget } from '../CanvasZoomWidget';

vi.mock('@xyflow/react', () => ({
  Panel: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Handle: () => null,
  NodeResizer: () => null,
  NodeToolbar: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  useStore: (selector: (state: { transform: number[] }) => number) =>
    selector({ transform: [0, 0, 1] }),
}));

afterEach(cleanup);

async function renderWithLanguage(
  element: ReactNode,
  language: 'en' | 'ja' = 'ja'
) {
  const i18n = await createI18nInstance(language);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
      {children}
    </UiLanguageProvider>
  );
  return render(element, { wrapper: Wrapper });
}

it('localizes canvas tool rail labels and keeps tool actions connected', async () => {
  const onToolChange = vi.fn();
  await renderWithLanguage(
    <CanvasToolRail
      tool="select"
      onToolChange={onToolChange}
      readOnly={false}
      onAddCard={vi.fn()}
      onAddReference={vi.fn()}
      onTogglePin={vi.fn()}
      pinPlacement={false}
      onSaveView={vi.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: '手のひら' }));
  expect(onToolChange).toHaveBeenCalledExactlyOnceWith('hand');
  expect(screen.getByRole('button', { name: '付箋' })).not.toBeNull();
  expect(
    screen.getByRole('button', {
      name: '既存のファイルまたは共有ドキュメントをボードに配置',
    })
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: '現在の位置とズームをボードの開始時の表示として保存' })
  ).not.toBeNull();
});

it('localizes zoom controls, level accessibility name, and menu options', async () => {
  await renderWithLanguage(
    <CanvasZoomWidget
      minimap={false}
      gridSnap={false}
      smartGuides
      onToggle={vi.fn()}
      onZoomTo={vi.fn()}
      onZoomIn={vi.fn()}
      onZoomOut={vi.fn()}
      onFitAll={vi.fn()}
      onFitSelection={vi.fn()}
      onSavedView={vi.fn()}
      hasSavedView
    />
  );

  expect(screen.getByRole('button', { name: 'ミニマップ' })).not.toBeNull();
  expect(screen.getByRole('button', { name: 'ズーム 100%' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'ズーム 100%' }));
  expect(screen.getByText('すべて表示')).not.toBeNull();
  expect(
    screen.getByText('選択範囲に合わせる')
  ).not.toBeNull();
  expect(screen.getByText('保存した表示')).not.toBeNull();
  expect(screen.getByText('グリッドにスナップ')).not.toBeNull();
});

it('localizes the frame card name placeholder', async () => {
  await renderWithLanguage(
    <CanvasCardNode
      {...({
        id: 'frame-1',
        type: 'canvasCard',
        data: {
          node: {
            id: 'frame-1',
            type: 'group',
            label: '',
            x: 0,
            y: 0,
            width: 300,
            height: 200,
          },
          kind: 'group',
          active: true,
          lod: 'warm',
          readOnly: false,
        },
        selected: false,
      } as ComponentProps<typeof CanvasCardNode>)}
    />
  );

  expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe('フレーム');
});

it('localizes the unsupported canvas-card fallback while preserving its type identifier', async () => {
  await renderWithLanguage(
    <CanvasCardNode
      {...({
        id: 'foreign-1',
        type: 'canvasCard',
        data: {
          node: {
            id: 'foreign-1',
            type: 'foreign-card',
            label: 'Foreign card',
            x: 0,
            y: 0,
            width: 300,
            height: 200,
          },
          kind: 'unsupported',
          active: false,
          lod: 'cold',
          readOnly: true,
        },
        selected: false,
      } as ComponentProps<typeof CanvasCardNode>)}
    />,
  );

  expect(screen.getByText('種類: foreign-card')).not.toBeNull();
  expect(screen.getByText('未対応のカード形式です。ボードの保存時もデータは保持されます。')).not.toBeNull();
});
