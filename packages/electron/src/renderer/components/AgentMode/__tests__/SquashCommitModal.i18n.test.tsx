// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SquashCommitModal } from '../SquashCommitModal';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));

afterEach(async () => {
  cleanup();
  await i18next.changeLanguage('en');
});

describe('squash modal localization', () => {
  it('translates UI while preserving the typed commit message across language changes', async () => {
    const onConfirm = vi.fn();
    render(<SquashCommitModal isOpen commitCount={2} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this commit text' } });
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByRole('textbox').getAttribute('placeholder')).toBe(i18next.t('dialogs:squash.placeholder'));
    expect(screen.getByRole('heading').textContent).toBe(i18next.t('dialogs:squash.title', { count: 2 }));
    fireEvent.click(screen.getByRole('button', { name: i18next.t('dialogs:squash.confirm') }));
    expect(onConfirm).toHaveBeenCalledWith('Keep this commit text');
  });
});
