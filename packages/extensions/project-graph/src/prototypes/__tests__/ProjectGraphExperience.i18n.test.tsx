// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import type { PanelHostProps } from '@nimbalyst/extension-sdk';
import type { GraphNodeTypeSchema, ProjectGraphNode } from '../../types';
import { DomActionRing } from '../../components/DomActionRing';
import { ProjectGraphExperience } from '../ProjectGraphExperience';

vi.mock('../../components/ProjectGraphPanel', () => ({
  ProjectGraphPanel: () => <div data-testid="legacy-project-graph" />,
}));

vi.mock('../PrototypeLab', () => ({
  PrototypeLab: () => <div data-testid="project-understanding" />,
}));

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('ProjectGraphExperience localization', () => {
  it('renders localized mode title and switch controls', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <ProjectGraphExperience host={{} as PanelHostProps['host']} />
      </UiLanguageProvider>,
    );

    expect(screen.getByText('プロジェクトの把握')).toBeTruthy();
    expect(screen.getByText('Atlas · Pulse · Evidence Trails')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '詳細: 従来のグラフ' }));
    expect(screen.getByText('詳細 · 従来のグラフと状態履歴')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'プロジェクトビューに戻る' })).toBeTruthy();
    expect(screen.getByTestId('legacy-project-graph')).toBeTruthy();
  });

  it('localizes graph action labels and tooltips without changing their actions', () => {
    const node: ProjectGraphNode = {
      id: 'project-1',
      type: 'project',
      label: 'Project',
      category: 'delivery',
      source: 'tracker',
      visibility: 'local',
      fields: { path: 'project.md' },
    };
    const schema: GraphNodeTypeSchema = {
      type: 'project',
      label: 'Project',
      category: 'delivery',
      colorToken: 'blue',
      shape: 'dot',
      childTypes: ['bug'],
      quickActions: ['launch-session'],
    };
    const onAction = vi.fn();

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <DomActionRing x={100} y={100} node={node} schema={schema} onAction={onAction} />
      </UiLanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'セッションを開始' }));
    expect(onAction).toHaveBeenCalledWith('launch-session');
    expect(screen.getByTitle('グループを展開')).toBeTruthy();
    expect(screen.getByTitle('子項目を追加')).toBeTruthy();
    expect(screen.getByTitle('ファイルを開く')).toBeTruthy();
    expect(screen.getByRole('button', { name: '開く' })).toBeTruthy();
  });
});
