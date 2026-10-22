// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { describeTrackerSchemaDestructiveChange } from '@nimbalyst/tracker-schema';
import type { TrackerSchemaBlastRadiusEntry } from '@nimbalyst/tracker-schema';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

import { TrackerSchemaChangeConfirm } from '../TrackerSchemaChangeConfirm';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function makePreview() {
  const blastRadius = [{
    change: {
      kind: 'field-removed',
      fieldName: 'severity',
      field: { name: 'severity', type: 'number' },
    },
    affectedItemCount: 7,
  }] as unknown as TrackerSchemaBlastRadiusEntry[];
  const copy = describeTrackerSchemaDestructiveChange({
    displayNamePlural: 'Bugs',
    sharing: 'team',
    teamName: 'Nimbalyst',
    blastRadius,
    renameCandidates: [{
      previousFieldName: 'severity',
      nextFieldName: 'priority',
      match: 'exact-definition',
    }],
  });
  return {
    classification: 'destructive' as const,
    verdict: { allowed: false as const, reason: 'needs-confirmation' as const, blocking: [] },
    blastRadiusText: copy.blastRadius,
    copy,
  };
}

describe('TrackerSchemaChangeConfirm localization', () => {
  it('localizes generated confirmation copy and preserves the option id', () => {
    const onApply = vi.fn();
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TrackerSchemaChangeConfirm
          preview={makePreview()}
          onApply={onApply}
          onCancel={vi.fn()}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText('NimbalystのBugsを変更しますか？')).toBeDefined();
    expect(screen.getByText('`severity` を持つ項目が7件あります。')).toBeDefined();
    expect(screen.getByText(/このトラッカーはチームで共有/)).toBeDefined();
    expect(screen.getByText('`severity` を `priority` に名前変更（値を保持）')).toBeDefined();
    expect(screen.getByText('`severity`を廃止')).toBeDefined();
    expect(screen.getByRole('button', { name: '変更を適用' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: '変更を適用' }));
    expect(onApply).toHaveBeenCalledWith('rename:severity->priority');
  });
});
