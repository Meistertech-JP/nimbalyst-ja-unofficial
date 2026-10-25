// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { globalRegistry, type FieldDefinition, type TrackerDataModel } from '@nimbalyst/tracker-schema';
import { typeFieldLabels } from '../typePageFieldLabels';

const typeId = 'typePageLabelTest';

describe('TypePageTab field labels', () => {
  afterEach(() => globalRegistry.unregister(typeId));

  it('localizes generated fixed fields while preserving explicit labels and custom field names', () => {
    const explicitStatus = { name: 'customStatus', type: 'select', displayLabel: 'Status' } as unknown as FieldDefinition;
    const model: TrackerDataModel = {
      type: typeId,
      displayName: 'Label test',
      displayNamePlural: 'Label tests',
      icon: 'assignment',
      color: 'var(--nim-primary)',
      modes: { inline: true, fullDocument: true },
      idPrefix: 'LBL',
      idFormat: 'ulid',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'status', type: 'select' },
        { name: 'owner', type: 'user' },
        { name: 'dueDate', type: 'date' },
        explicitStatus,
        { name: 'workflowState', type: 'text' },
      ],
      roles: { title: 'title', workflowStatus: 'status', assignee: 'owner', dueDate: 'dueDate' },
    };
    globalRegistry.register(model);

    let language: 'en' | 'ja' = 'ja';
    const labels = {
      en: { 'columns.status': 'Status', 'columns.owner': 'Owner', 'columns.dueDate': 'Due Date' },
      ja: { 'columns.status': 'ステータス', 'columns.owner': '担当者', 'columns.dueDate': '期限' },
    };
    const translate = (key: string) => labels[language][key as keyof typeof labels.ja] ?? key;

    expect(typeFieldLabels(typeId, translate)).toEqual([
      'ステータス', '担当者', '期限', 'Status', 'Workflow State',
    ]);
    language = 'en';
    expect(typeFieldLabels(typeId, translate)).toEqual([
      'Status', 'Owner', 'Due Date', 'Status', 'Workflow State',
    ]);
  });
});
