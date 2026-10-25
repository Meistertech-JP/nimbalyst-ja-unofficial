// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyTypeColumnDisplay,
  getInitials,
  getCellValue,
  getDefaultColumnConfig,
  getEffectiveUpdatedDate,
  getTypeIcon,
  getTypeLabel,
  localizeTrackerColumns,
  resolveColumnFieldName,
  resolveColumnsForType,
  resolveTypeColumnDisplay,
  type TrackerColumnDef,
} from '../trackerColumns';
import { resolveTrackerOrderingValue } from '../../models/trackerOrdering';
import { globalRegistry } from '../../models';
import { emptyLabelRegistry, type FieldDefinition, type TrackerDataModel } from '@nimbalyst/tracker-schema';
import type { TrackerRecord } from '../../../../core/TrackerRecord';

describe('trackerColumns', () => {
  it('localizes only exact fixed labels and leaves custom column metadata intact across languages', () => {
    const options = [{ value: 'todo', label: 'To Do' }];
    const columns = [
      { id: 'type', label: 'Type', labelSource: 'fixed', role: undefined },
      { id: 'key', label: 'Key', labelSource: 'fixed', role: undefined },
      { id: 'title', label: 'Title', labelSource: 'fixed', role: 'title' },
      { id: 'status', label: 'Status', labelSource: 'fixed', role: 'workflowStatus' },
      { id: 'priority', label: 'Priority', labelSource: 'fixed', role: 'priority' },
      { id: 'owner', label: 'Owner', labelSource: 'fixed', role: 'assignee' },
      { id: 'dueDate', label: 'Due Date', labelSource: 'fixed', role: 'dueDate' },
      { id: 'startDate', label: 'Start Date', labelSource: 'fixed', role: 'startDate' },
      { id: 'reporterEmail', label: 'Reporter', labelSource: 'fixed', role: 'reporter' },
      { id: 'tags', label: 'Tags', labelSource: 'fixed', role: 'tags' },
      { id: 'progress', label: 'Progress', labelSource: 'fixed', role: 'progress' },
      { id: 'updated', label: 'Updated', labelSource: 'fixed', role: undefined },
      { id: 'createdBy', label: 'Created by', labelSource: 'fixed', role: undefined },
      { id: 'updatedBy', label: 'Updated by', labelSource: 'fixed', role: undefined },
      { id: 'viewed', label: 'Viewed', labelSource: 'fixed', role: undefined },
      { id: 'module', label: 'Source', labelSource: 'fixed', role: undefined },
      { id: 'shared', label: 'Publication', labelSource: 'fixed', role: undefined },
      { id: 'created', label: 'Created', labelSource: 'fixed', role: undefined },
      { id: 'workflowState', label: 'Workflow State', labelSource: 'schema', role: 'workflowStatus' },
      { id: 'status', label: 'Custom status', labelSource: 'custom', role: 'workflowStatus' },
      { id: 'custom', label: 'My field', labelSource: 'custom', role: undefined, options },
    ] as TrackerColumnDef[];
    const dictionaries = {
      en: {
        'columns.type': 'Type', 'columns.key': 'Key', 'columns.title': 'Title',
        'columns.status': 'Status', 'columns.priority': 'Priority', 'columns.owner': 'Owner',
        'columns.dueDate': 'Due Date', 'columns.updated': 'Updated',
        'columns.startDate': 'Start Date', 'columns.reporter': 'Reporter', 'columns.tags': 'Tags', 'columns.progress': 'Progress',
        'columns.createdBy': 'Created by', 'columns.updatedBy': 'Updated by', 'columns.viewed': 'Viewed',
        'columns.module': 'Source', 'columns.publication': 'Publication', 'columns.created': 'Created',
      },
      ja: {
        'columns.type': '種類', 'columns.key': 'キー', 'columns.title': 'タイトル',
        'columns.status': 'ステータス', 'columns.priority': '優先度', 'columns.owner': '担当者',
        'columns.dueDate': '期限', 'columns.updated': '更新日時',
        'columns.startDate': '開始日', 'columns.reporter': '報告者', 'columns.tags': 'タグ', 'columns.progress': '進捗',
        'columns.createdBy': '作成者', 'columns.updatedBy': '更新者', 'columns.viewed': '閲覧日時',
        'columns.module': 'ソース', 'columns.publication': '公開状態', 'columns.created': '作成日時',
      },
    };
    let language: keyof typeof dictionaries = 'ja';
    const translate = (key: string) => dictionaries[language][key as keyof typeof dictionaries.ja] ?? key;

    const japanese = localizeTrackerColumns(columns, translate);
    expect(japanese.map(column => column.label)).toEqual([
      '種類', 'キー', 'タイトル', 'ステータス', '優先度', '担当者', '期限', '開始日', '報告者', 'タグ', '進捗', '更新日時',
      '作成者', '更新者', '閲覧日時', 'ソース', '公開状態', '作成日時',
      'Workflow State', 'Custom status', 'My field',
    ]);
    expect(japanese.map(column => column.id)).toEqual(columns.map(column => column.id));
    expect(japanese.map(column => column.role)).toEqual(columns.map(column => column.role));
    expect((japanese.find(column => column.id === 'custom') as TrackerColumnDef & { options: typeof options }).options).toBe(options);

    const actualFallback = localizeTrackerColumns(resolveColumnsForType(''), translate);
    expect(actualFallback.find(column => column.id === 'startDate')?.label).toBe('開始日');
    expect(actualFallback.find(column => column.id === 'reporterEmail')?.label).toBe('報告者');
    expect(actualFallback.find(column => column.id === 'tags')?.label).toBe('タグ');
    expect(actualFallback.find(column => column.id === 'progress')?.label).toBe('進捗');
    expect(actualFallback.find(column => column.id === 'createdBy')?.label).toBe('作成者');

    language = 'en';
    expect(localizeTrackerColumns(columns, translate).map(column => column.label))
      .toEqual(columns.map(column => column.label));
  });

  it('distinguishes generated labels from an explicit displayLabel that matches a built-in label', () => {
    const model = (type: string, displayLabel?: string): TrackerDataModel => ({
      type,
      displayName: type,
      displayNamePlural: `${type}s`,
      icon: 'assignment',
      color: 'var(--nim-primary)',
      modes: { inline: true, fullDocument: true },
      idPrefix: 'LBL',
      idFormat: 'ulid',
      fields: [
        { name: 'title', type: 'string', required: true },
        ...(displayLabel === undefined
          ? [{ name: 'status', type: 'select' } as FieldDefinition]
          : [{ name: 'status', type: 'select', displayLabel } as unknown as FieldDefinition]),
      ],
      roles: { title: 'title', workflowStatus: 'status' },
    });
    globalRegistry.register(model('generatedStatusLabel'));
    globalRegistry.register(model('explicitStatusLabel', 'Status'));

    const japanese = localizeTrackerColumns(
      [resolveColumnsForType('generatedStatusLabel'), resolveColumnsForType('explicitStatusLabel')]
        .map(columns => columns.find(column => column.id === 'status')!),
      key => key === 'columns.status' ? 'ステータス' : key,
    );

    expect(japanese[0]).toMatchObject({ id: 'status', label: 'ステータス', labelSource: 'schema' });
    expect(japanese[1]).toMatchObject({ id: 'status', label: 'Status', labelSource: 'custom' });
  });

  it('gives the structural type column enough width for the grid header and icon', () => {
    const typeColumn = resolveColumnsForType('').find(column => column.id === 'type');

    expect(typeColumn).toBeDefined();
    expect(typeColumn?.width).toBe(64);
    expect(typeColumn?.minWidth).toBe(64);
  });

  it('exposes creator identity as a read-only structural user column', () => {
    const createdByColumn = resolveColumnsForType('').find(column => column.id === 'createdBy');
    const authorIdentity = {
      email: 'alice@example.com',
      displayName: 'Alice Example',
      gitName: null,
      gitEmail: null,
    };
    const record: TrackerRecord = {
      id: 'bug-creator',
      primaryType: 'bug',
      typeTags: ['bug'],
      source: 'native',
      archived: false,
      syncStatus: 'synced',
      fields: {},
      system: {
        workspace: '/repo',
        createdAt: '2026-07-24T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
        authorIdentity,
      },
    };

    expect(createdByColumn).toMatchObject({
      label: 'Created by',
      render: 'avatar',
      editable: false,
    });
    expect(getCellValue(record, 'createdBy')).toEqual(authorIdentity);
  });

  it('exposes viewed and updater identity as read-only structural columns', () => {
    const columns = resolveColumnsForType('');
    const viewedColumn = columns.find(column => column.id === 'viewed');
    const updatedByColumn = columns.find(column => column.id === 'updatedBy');
    const lastModifiedBy = {
      email: 'bob@example.com',
      displayName: 'Bob Example',
      gitName: null,
      gitEmail: null,
    };
    const record: TrackerRecord = {
      id: 'bug-viewed',
      primaryType: 'bug',
      typeTags: ['bug'],
      source: 'native',
      archived: false,
      syncStatus: 'synced',
      fields: { viewed: new Date('2026-07-24T10:00:00.000Z') },
      system: {
        workspace: '/repo',
        createdAt: '2026-07-23T00:00:00.000Z',
        updatedAt: '2026-07-24T00:00:00.000Z',
        lastModifiedBy,
      },
    };

    expect(viewedColumn).toMatchObject({ label: 'Viewed', render: 'date', editable: false });
    expect(updatedByColumn).toMatchObject({ label: 'Updated by', render: 'avatar', editable: false });
    expect(getCellValue(record, 'viewed')).toEqual(record.fields.viewed);
    expect(getCellValue(record, 'updatedBy')).toEqual(lastModifiedBy);
    expect(getCellValue(record, 'created')).toBe('2026-07-23T00:00:00.000Z');
  });

  it('uses file mtime for frontmatter rows with day-precision updated timestamps', () => {
    const record: TrackerRecord = {
      id: 'plan-branching',
      primaryType: 'plan',
      typeTags: ['plan'],
      source: 'frontmatter',
      archived: false,
      syncStatus: 'local',
      fields: {},
      system: {
        workspace: '/repo',
        documentPath: 'nimbalyst-local/plans/branching.md',
        lineNumber: 0,
        createdAt: '2026-07-08',
        updatedAt: '2026-07-08T00:00:00.000Z',
        lastIndexed: '2026-07-08T16:36:30.000Z',
      },
    };

    expect(getEffectiveUpdatedDate(record)?.toISOString()).toBe('2026-07-08T16:36:30.000Z');
  });

  /**
   * The Key column showed nothing for an unshared item even after the local
   * numbering sweep had given every row a number, because it read `issueKey`
   * alone. The detail pane got the fallback and the columns did not.
   */
  describe('the key column', () => {
    function keyRecord(keys: { issueKey?: string; localKey?: string }): TrackerRecord {
      return {
        id: 'bug-key',
        primaryType: 'bug',
        typeTags: ['bug'],
        source: 'native',
        archived: false,
        syncStatus: 'local',
        fields: {},
        system: { workspace: '/repo', createdAt: '2026-08-01', updatedAt: '2026-08-01' },
        ...keys,
      };
    }

    it('prefers the team key, which is the only one that means the same thing to everyone', () => {
      expect(getCellValue(keyRecord({ issueKey: 'NIM-2999', localKey: 'NIC.42' }), 'key')).toBe('NIM-2999');
    });

    it('falls back to this machine local number', () => {
      expect(getCellValue(keyRecord({ localKey: 'NIC.42' }), 'key')).toBe('NIC.42');
    });

    /**
     * `LC-###` is a leftover from the rolled-back provisional scheme. Those
     * values were reissued as items were acked, so one of them displayed
     * where a stable number exists points at nothing in particular.
     */
    it('ignores a leftover provisional key in favour of the local number', () => {
      expect(getCellValue(keyRecord({ issueKey: 'LC-1', localKey: 'NIC.42' }), 'key')).toBe('NIC.42');
    });

    it('shows nothing when the item has neither', () => {
      expect(getCellValue(keyRecord({}), 'key')).toBe('');
    });

    it('sorts on whichever key it displays', () => {
      expect(resolveTrackerOrderingValue(keyRecord({ localKey: 'NIC.42' }), 'key')).toBe('NIC.42');
      expect(resolveTrackerOrderingValue(keyRecord({ issueKey: 'LC-1', localKey: 'NIC.42' }), 'key')).toBe('NIC.42');
    });
  });
});

/**
 * The cross-tracker "All" view resolves its columns with the empty type, because no
 * single schema describes a mixed list. Its columns therefore have to be role-backed:
 * two types can both have a due date and store it under different field names, and
 * nothing on screen reveals which field a column actually read (nimbalyst#1129).
 */
describe('cross-tracker column resolution', () => {
  const conventional: TrackerDataModel = {
    type: 'crossDeliverable',
    displayName: 'Deliverable',
    displayNamePlural: 'Deliverables',
    icon: 'assignment',
    color: 'var(--nim-primary)',
    modes: { inline: true, fullDocument: true },
    idPrefix: 'CDL',
    idFormat: 'ulid',
    sharing: 'personal',
    draftByDefault: false,
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'owner', type: 'user' },
      { name: 'dueDate', type: 'date' },
    ],
    roles: { title: 'title', assignee: 'owner', dueDate: 'dueDate' },
  };

  const remapped: TrackerDataModel = {
    ...conventional,
    type: 'crossInvoice',
    displayName: 'Invoice',
    displayNamePlural: 'Invoices',
    idPrefix: 'CIN',
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'accountManager', type: 'user' },
      { name: 'targetDate', type: 'date' },
    ],
    roles: { title: 'title', assignee: 'accountManager', dueDate: 'targetDate' },
  };

  beforeEach(() => {
    globalRegistry.register(conventional);
    globalRegistry.register(remapped);
  });

  it('reads each type own field through one shared Owner and Due Date column', () => {
    const columns = resolveColumnsForType('');
    const owner = columns.find(column => column.id === 'owner');
    const dueDate = columns.find(column => column.id === 'dueDate');

    expect(owner).toMatchObject({ label: 'Owner', role: 'assignee', render: 'avatar' });
    expect(dueDate).toMatchObject({ label: 'Due Date', role: 'dueDate', render: 'date' });

    expect(resolveColumnFieldName('crossDeliverable', owner!)).toBe('owner');
    expect(resolveColumnFieldName('crossInvoice', owner!)).toBe('accountManager');
    expect(resolveColumnFieldName('crossDeliverable', dueDate!)).toBe('dueDate');
    expect(resolveColumnFieldName('crossInvoice', dueDate!)).toBe('targetDate');
  });

  it('shows Owner and Due Date by default so overdue and unassigned work is visible', () => {
    expect(getDefaultColumnConfig('').visibleColumns)
      .toEqual(['type', 'key', 'title', 'status', 'priority', 'owner', 'dueDate', 'updated']);
  });

  it('leaves a single-tracker view resolving to its own field names', () => {
    const dueDate = resolveColumnsForType('crossInvoice').find(column => column.id === 'targetDate');

    expect(dueDate?.role).toBe('dueDate');
    expect(resolveColumnFieldName('crossInvoice', dueDate!)).toBe('targetDate');
  });
});

/**
 * The Type column used to read a hardcoded map of the seven built-in types, so a
 * workspace running custom types got an empty glyph on most of its rows
 * (nimbalyst#1422). Identity now comes from the type's own schema, and the
 * column can print the name instead when a glyph cannot carry ~30 types.
 */
describe('type column identity and display', () => {
  const declaresIcon: TrackerDataModel = {
    type: 'incidentReview',
    displayName: 'Incident Review',
    displayNamePlural: 'Incident Reviews',
    icon: 'siren',
    color: '#dc2626',
    modes: { inline: true, fullDocument: false },
    idPrefix: 'INC',
    idFormat: 'ulid',
    fields: [{ name: 'title', type: 'string', required: true }],
    roles: { title: 'title' },
  };

  const declaresNoIcon: TrackerDataModel = {
    ...declaresIcon,
    type: 'vendor-contract',
    displayName: '',
    displayNamePlural: '',
    icon: '',
    idPrefix: 'VEN',
  };

  beforeEach(() => {
    globalRegistry.register(declaresIcon);
    globalRegistry.register(declaresNoIcon);
  });

  it('shows a Title column for a custom type that declares no roles', () => {
    globalRegistry.register({ ...declaresIcon, type: 'gadget', idPrefix: 'GAD', roles: undefined });

    expect(resolveColumnsForType('gadget').find(column => column.id === 'title')?.role).toBe('title');
    expect(getDefaultColumnConfig('gadget').visibleColumns).toContain('title');
  });

  it('resolves a custom type icon from its own schema', () => {
    expect(getTypeIcon('incidentReview')).toBe('siren');
  });

  it('never renders an empty glyph for a type that declares no icon', () => {
    expect(getTypeIcon('vendor-contract')).toBeTruthy();
    expect(getTypeIcon('neverRegisteredAnywhere')).toBeTruthy();
  });

  it('names a type from its schema, falling back to a readable form of its id', () => {
    expect(getTypeLabel('incidentReview')).toBe('Incident Review');
    expect(getTypeLabel('vendor-contract')).toBe('Vendor contract');
    expect(getTypeLabel('postMortem')).toBe('Post Mortem');
  });

  it('defaults to the icon, including for configs saved before the option existed', () => {
    expect(getDefaultColumnConfig('incidentReview').typeColumnDisplay).toBe('icon');
    expect(resolveTypeColumnDisplay({ typeColumnDisplay: undefined })).toBe('icon');
    expect(resolveTypeColumnDisplay({ typeColumnDisplay: 'label' })).toBe('label');
  });

  it('widens the type column and marks it for names only in label mode', () => {
    const columns = resolveColumnsForType('incidentReview');
    const iconMode = applyTypeColumnDisplay(columns, 'icon').find(c => c.id === 'type')!;
    const labelMode = applyTypeColumnDisplay(columns, 'label').find(c => c.id === 'type')!;

    expect(iconMode.typeDisplay).toBeUndefined();
    expect(labelMode.typeDisplay).toBe('label');
    expect(labelMode.width).toBeGreaterThan(iconMode.width as number);
  });

  it('leaves every other column alone in label mode', () => {
    const columns = resolveColumnsForType('incidentReview');
    const switched = applyTypeColumnDisplay(columns, 'label');

    expect(switched.filter(c => c.id !== 'type')).toEqual(columns.filter(c => c.id !== 'type'));
  });
});

describe('legacy qualified label values', () => {
  const record = (fields: Record<string, unknown>) => ({
    id: 'ent-1', primaryType: 'entity', typeTags: ['entity'], source: 'native', archived: false,
    syncStatus: 'local', system: { workspace: '/ws', createdAt: '', updatedAt: '' }, fields,
  }) as unknown as TrackerRecord;

  it('shows a qualified property by its value, never the stored object', () => {
    globalRegistry.setLabels({
      labels: [],
      properties: [{ id: 'flag', label: 'Flag', type: 'string', qualifiers: { rollout: { type: 'number' } } }],
      claimProperties: {},
    });
    try {
      expect(getCellValue(record({ flag: { value: 'new-editor', qualifiers: { rollout: 25 } } }), 'flag')).toBe('new-editor');
      // An object field that is not a qualified property is left alone.
      expect(getCellValue(record({ other: { value: 1 } }), 'other')).toEqual({ value: 1 });
    } finally {
      globalRegistry.setLabels(emptyLabelRegistry());
    }
  });
});

describe('getInitials', () => {
  it('tolerates an identity with no display name instead of crashing the avatar', () => {
    expect(getInitials(undefined as unknown as string)).toBe('?');
    expect(getInitials('   ')).toBe('?');
    expect(getInitials('Ada Lovelace')).toBe('AL');
  });
});
