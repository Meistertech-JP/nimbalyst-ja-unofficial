/**
 * The chart block's source editor in a shared document: what it writes on
 * blur when a teammate's update lands while it is open.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';

const testNode = vi.hoisted(() => ({
  source: '',
  writes: [] as string[],
  setSource(next: string) {
    this.source = next;
    this.writes.push(next);
  },
}));

vi.mock('lexical', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lexical')>()),
  $getNodeByKey: () => testNode,
}));
vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: () => [{ update: (fn: () => void) => fn(), getRootElement: () => null, isEditable: () => true }],
}));
vi.mock('@lexical/react/useLexicalEditable', () => ({ useLexicalEditable: () => true }));
vi.mock('../ChartNodeCore', () => ({ $isChartNode: (node: unknown) => node === testNode }));
// The chart itself is covered in `VegaChart.test.tsx`; this file is about the source.
vi.mock('../../../../ui/chart/VegaChart', () => ({ VegaChart: () => null, DEFAULT_CHART_HEIGHT: 260 }));

import { ChartBlock } from '../ChartBlock';

async function renderBlock(source: string) {
  testNode.source = source;
  const i18n = await createI18nInstance('en');
  const view = render(
    <I18nextProvider i18n={i18n}>
      <ChartBlock source={source} nodeKey="k" />
    </I18nextProvider>,
  );
  return {
    ...view,
    remoteUpdate(next: string) {
      testNode.source = next;
      view.rerender(
        <I18nextProvider i18n={i18n}>
          <ChartBlock source={next} nodeKey="k" />
        </I18nextProvider>,
      );
    },
  };
}

describe('ChartBlock source editor', () => {
  beforeEach(() => {
    testNode.writes = [];
  });

  it('never saves an untouched draft over a teammate\'s update', async () => {
    const block = await renderBlock('original');
    fireEvent.click(screen.getByTestId('chart-block-edit'));
    block.remoteUpdate('remote edit');
    fireEvent.blur(screen.getByTestId('chart-block-source'));
    expect(testNode.writes).toEqual([]);
    expect(testNode.source).toBe('remote edit');
  });

  it('saves an edited draft when the node has not changed underneath it', async () => {
    await renderBlock('original');
    fireEvent.click(screen.getByTestId('chart-block-edit'));
    fireEvent.change(screen.getByTestId('chart-block-source'), { target: { value: 'mine' } });
    fireEvent.blur(screen.getByTestId('chart-block-source'));
    expect(testNode.writes).toEqual(['mine']);
  });

  it('keeps an edited draft and asks when the node changed underneath it', async () => {
    const block = await renderBlock('original');
    fireEvent.click(screen.getByTestId('chart-block-edit'));
    fireEvent.change(screen.getByTestId('chart-block-source'), { target: { value: 'mine' } });
    block.remoteUpdate('remote edit');
    fireEvent.blur(screen.getByTestId('chart-block-source'));
    expect(testNode.writes).toEqual([]);
    expect(screen.getByTestId('chart-block-conflict').textContent).toContain('changed while you were editing');
    expect((screen.getByTestId('chart-block-source') as HTMLTextAreaElement).value).toBe('mine');

    fireEvent.click(screen.getByTestId('chart-block-conflict-discard'));
    expect(testNode.writes).toEqual([]);
    expect(screen.queryByTestId('chart-block-source')).toBeNull();

    fireEvent.click(screen.getByTestId('chart-block-edit'));
    fireEvent.change(screen.getByTestId('chart-block-source'), { target: { value: 'mine again' } });
    block.remoteUpdate('second remote');
    fireEvent.blur(screen.getByTestId('chart-block-source'));
    fireEvent.click(screen.getByTestId('chart-block-conflict-overwrite'));
    expect(testNode.writes).toEqual(['mine again']);
  });
});
