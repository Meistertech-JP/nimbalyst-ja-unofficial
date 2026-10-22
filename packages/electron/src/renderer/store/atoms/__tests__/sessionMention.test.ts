import { expect, test } from 'vitest';
import { createStore } from 'jotai';
import { searchSessionMentionAtom, sessionMentionOptionsAtom } from '../sessionMention';
import { sessionRegistryAtom } from '../sessions';

test('keeps an untitled session label empty for localized rendering', () => {
  const store = createStore();
  store.set(sessionRegistryAtom, new Map([[
    'session-12345',
    {
      id: 'session-12345',
      title: '',
      provider: 'claude',
      sessionType: 'session',
      workspaceId: '/workspace',
      worktreeId: null,
      parentSessionId: null,
      childCount: 0,
      uncommittedCount: 0,
      createdAt: 1,
      updatedAt: 2,
      messageCount: 0,
      isArchived: false,
      isPinned: false,
    },
  ]]));

  store.set(searchSessionMentionAtom, { workspacePath: '/workspace', query: '' });

  expect(store.get(sessionMentionOptionsAtom('/workspace'))[0]).toMatchObject({
    label: '',
    data: { title: '', isUntitledSession: true },
  });
});
