// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { formatTrackerActivity } from '../trackerActivityPresentation';

let t: Awaited<ReturnType<typeof createI18nInstance>>['t'];
let tJa: Awaited<ReturnType<typeof createI18nInstance>>['t'];
beforeAll(async () => {
  const [english, japanese] = await Promise.all([createI18nInstance('en'), createI18nInstance('ja')]);
  t = english.getFixedT('en', 'tracker');
  tJa = japanese.getFixedT('ja', 'tracker');
});

describe('formatTrackerActivity', () => {
  it('shows before and after values for field changes', () => {
    expect(formatTrackerActivity({
      action: 'updated',
      field: 'priority',
      oldValue: 'low',
      newValue: 'high',
    }, t)).toBe('changed priority from “low” to “high”');
  });

  it('describes content updates without dumping content', () => {
    expect(formatTrackerActivity({ action: 'updated', field: 'content' }, t))
      .toBe('updated content');
  });

  it('describes comment edits and deletes with relevant detail', () => {
    expect(formatTrackerActivity({
      action: 'comment_updated',
      oldValue: 'before',
      newValue: 'after',
    }, t)).toBe('edited a comment from “before” to “after”');
    expect(formatTrackerActivity({
      action: 'comment_deleted',
      oldValue: 'obsolete',
    }, t)).toBe('deleted comment “obsolete”');
  });

  it('formats a Japanese activity summary', () => {
    expect(formatTrackerActivity({ action: 'created' }, tJa)).toBe('この項目を作成しました');
    expect(formatTrackerActivity({ action: 'status_changed', newValue: 'Done' }, tJa))
      .toBe('ステータスを“Done”に変更しました');
  });
});
