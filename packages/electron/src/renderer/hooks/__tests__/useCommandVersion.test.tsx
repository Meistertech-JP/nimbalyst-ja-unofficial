// @vitest-environment jsdom
import { useEffect } from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCommandVersion } from '../useCommandVersion';
import { useConfirmDialog } from '../useConfirmDialog';

afterEach(cleanup);

function ConfirmationConsumer({ version, language, completed }: { version: number; language: string; completed: (value: boolean) => void }) {
  const dialog = useConfirmDialog();
  const claim = useCommandVersion(version);
  useEffect(() => {
    if (!claim(version)) return;
    void dialog.confirm({ title: language, message: language }).then(completed);
  }, [version, language, dialog, completed, claim]);
  return dialog.isOpen ? <button onClick={dialog.handleConfirm}>{dialog.options.title}</button> : null;
}

it('keeps the pending confirmation resolver across dialog and language rerenders', async () => {
  const completed = vi.fn();
  const view = render(<ConfirmationConsumer version={0} language="en" completed={completed} />);
  view.rerender(<ConfirmationConsumer version={1} language="en" completed={completed} />);
  view.rerender(<ConfirmationConsumer version={1} language="ja" completed={completed} />);
  await act(async () => { fireEvent.click(view.getByRole('button', { name: 'en' })); });
  expect(completed.mock.calls).toEqual([[true]]);
  expect(view.queryByRole('button')).toBeNull();
});

function Consumer({ version, language, ready, run }: { version: number; language: string; ready: boolean; run: (language: string) => void }) {
  const claim = useCommandVersion(version);
  useEffect(() => {
    if (!ready || !claim(version)) return;
    run(language);
  }, [version, language, ready, run, claim]);
  return null;
}

it('ignores history, consumes once across language rerenders and accepts the next command', () => {
  const run = vi.fn();
  const view = render(<Consumer version={3} language="en" ready run={run} />);
  expect(run).not.toHaveBeenCalled();
  view.rerender(<Consumer version={4} language="en" ready run={run} />);
  view.rerender(<Consumer version={4} language="ja" ready run={run} />);
  expect(run.mock.calls).toEqual([['en']]);
  view.rerender(<Consumer version={5} language="ja" ready run={run} />);
  expect(run.mock.calls).toEqual([['en'], ['ja']]);
});

it('keeps a pending command until its consumer is ready and ignores it after remount', () => {
  const run = vi.fn();
  const view = render(<Consumer version={0} language="en" ready={false} run={run} />);
  view.rerender(<Consumer version={1} language="en" ready={false} run={run} />);
  expect(run).not.toHaveBeenCalled();
  view.rerender(<Consumer version={1} language="ja" ready run={run} />);
  expect(run.mock.calls).toEqual([['ja']]);
  view.unmount();
  render(<Consumer version={1} language="ja" ready run={run} />);
  expect(run).toHaveBeenCalledTimes(1);
});
