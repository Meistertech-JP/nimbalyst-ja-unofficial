// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $getRoot, type LexicalEditor, type NodeKey } from 'lexical';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { QuadrantBlock } from '../QuadrantBlock';
import { $createQuadrantNode, $isQuadrantNode, QuadrantNode } from '../QuadrantNodeCore';

const SOURCE = '- First: 0.25, 0.75';
const UPDATED = '- Updated: 0.5, 0.5';

afterEach(cleanup);

describe('QuadrantBlock translated editing lifecycle', () => {
  it.each([
    ['en', 'Edit', 'Done'],
    ['ja', '編集', '完了'],
  ] as const)('uses %s edit controls and writes the edited source to the real node', async (language, edit, done) => {
    const i18n = await createI18nInstance(language);
    let editor!: LexicalEditor;
    let savedKey!: NodeKey;
    function Harness() {
      const [current] = useLexicalComposerContext();
      const [nodeKey, setNodeKey] = useState<NodeKey | null>(null);
      useEffect(() => {
        editor = current;
        current.update(() => {
          const node = $createQuadrantNode({ source: SOURCE });
          $getRoot().append(node);
          savedKey = node.getKey();
          setNodeKey(savedKey);
        }, { discrete: true });
      }, [current]);
      return nodeKey ? <QuadrantBlock source={SOURCE} nodeKey={nodeKey} /> : null;
    }
    render(
      <I18nextProvider i18n={i18n}>
        <LexicalComposer initialConfig={{ namespace: 'quadrant-i18n', nodes: [QuadrantNode], onError: (error) => { throw error; } }}>
          <Harness />
        </LexicalComposer>
      </I18nextProvider>,
    );
    const button = await screen.findByTestId('quadrant-block-edit');
    expect(button.textContent).toBe(edit);
    fireEvent.click(button);
    expect(button.textContent).toBe(done);
    fireEvent.change(screen.getByTestId('quadrant-block-source'), { target: { value: UPDATED } });
    await act(async () => { fireEvent.click(button); });
    expect(screen.queryByTestId('quadrant-block-source')).toBeNull();
    expect(button.textContent).toBe(edit);
    await waitFor(() => editor.getEditorState().read(() => {
      const node = $getNodeByKey(savedKey);
      expect($isQuadrantNode(node)).toBe(true);
      if (!$isQuadrantNode(node)) throw new Error('Quadrant node missing');
      expect(node.getSource()).toBe(UPDATED);
    }));
    await act(async () => { editor.setEditable(false); });
    expect(screen.queryByTestId('quadrant-block-edit')).toBeNull();
    expect(screen.getByTestId('quadrant-chart').tagName.toLowerCase()).toBe('svg');
  });
});
