// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@nimbalyst/runtime/plugins/TrackerPlugin/models';
import { TrackerColumnFilterPopover } from '../grid/TrackerColumnFilterPopover';

const statusField: FieldDefinition = {
  name: 'status',
  type: 'select',
  options: [
    { value: 'to-do', label: 'To do' },
    { value: 'in-progress', label: 'In progress' },
  ],
};

describe('TrackerColumnFilterPopover', () => {
  afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

  it('localizes operator labels and hints without changing schema values or AND/OR semantics', async () => {
    await i18next.changeLanguage('ja');
    const onApply = vi.fn();
    render(<TrackerColumnFilterPopover columnId="status" columnLabel="Custom status" field={statusField}
      clauses={[{ field: 'status', op: '=', value: 'to-do' }]} combinator="and"
      anchorRect={new DOMRect(0, 0, 100, 20)} onApply={onApply} onClose={vi.fn()} />);
    expect(screen.getByText('フィルター: Custom status')).toBeTruthy();
    expect(screen.getByText('この列だけでなく、すべての列フィルターに適用されます。')).toBeTruthy();
    expect(screen.getByText('次と同じ')).toBeTruthy();
    expect(screen.getByText('To do')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tracker-column-filter-add'));
    expect(screen.getByRole('button', { name: '条件2を削除' })).toBeTruthy();
    fireEvent.change(screen.getByTestId('tracker-column-filter-combinator'), { target: { value: 'or' } });
    fireEvent.change(screen.getByTestId('tracker-column-filter-op-1'), { target: { value: 'in' } });
    fireEvent.change(screen.getByTestId('tracker-column-filter-value-1'), { target: { value: 'to-do, in-progress' } });
    await act(async () => { await i18next.changeLanguage('en'); });
    expect(screen.getByText('Filter: Custom status')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tracker-column-filter-apply'));
    expect(onApply).toHaveBeenCalledWith([
      { field: 'status', op: '=', value: 'to-do' },
      { field: 'status', op: 'in', value: ['to-do', 'in-progress'] },
    ], 'or');
  });

  it('edits multiple clauses and the AND/OR combinator', () => {
    const onApply = vi.fn();
    render(
      <TrackerColumnFilterPopover
        columnId="status"
        columnLabel="Status"
        field={statusField}
        clauses={[{ field: 'status', op: '=', value: 'to-do' }]}
        combinator="and"
        anchorRect={new DOMRect(0, 0, 100, 20)}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('tracker-column-filter-combinator'), {
      target: { value: 'or' },
    });
    fireEvent.click(screen.getByTestId('tracker-column-filter-add'));
    fireEvent.change(screen.getByTestId('tracker-column-filter-value-1'), {
      target: { value: 'in-progress' },
    });
    fireEvent.click(screen.getByTestId('tracker-column-filter-apply'));

    expect(onApply).toHaveBeenCalledWith([
      { field: 'status', op: '=', value: 'to-do' },
      { field: 'status', op: '=', value: 'in-progress' },
    ], 'or');
  });
});
