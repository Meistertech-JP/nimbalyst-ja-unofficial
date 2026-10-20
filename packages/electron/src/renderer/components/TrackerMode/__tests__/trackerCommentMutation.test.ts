import { describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import { invokeTrackerCommentMutation } from '../trackerCommentMutation';

describe('invokeTrackerCommentMutation', () => {
  it('localizes only the fallback failure and retains the exact mutation payload', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false });
    const payload = { itemId: 'item-1', commentId: 'comment-1', body: 'Keep English user text' };
    await expect(invokeTrackerCommentMutation(invoke, 'tracker:update', payload, i18next.getFixedT('ja')))
      .rejects.toThrow('トラッカーのコメントを更新できませんでした');
    expect(invoke).toHaveBeenCalledWith('tracker:update', payload);
  });
  it('returns successful backend results', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: true, commentId: 'comment-1' });

    await expect(invokeTrackerCommentMutation(invoke, 'tracker:add', { body: 'hello' }))
      .resolves.toEqual({ success: true, commentId: 'comment-1' });
  });

  it('turns backend success:false results into actionable failures', async () => {
    const invoke = vi.fn().mockResolvedValue({ success: false, error: 'Item not found' });

    await expect(invokeTrackerCommentMutation(invoke, 'tracker:add', { body: 'hello' }))
      .rejects.toThrow('Item not found');
  });
});
