// The create form opens from the sidebar. A static export would keep it in the
// docs-ui eager graph; hosts that need the component import the deep path.
export type { CollabCreateItemDialogProps } from './CollabCreateItemDialog';
export const loadCollabCreateItemDialog = () => import('./CollabCreateItemDialog');
export * from './CollabDocsUIProvider';
export * from './useCollabPagesState';
export * from './CollabNewDocumentMenu';
export * from './CollabSidebar';
export type { CollabPageAction, CollabPageActionRequest } from './usePageActionRequest';
export * from './DocUnreadDot';
export * from './documentDrag';
export * from './documentPresentation';
export * from './documentTypeDisplayName';
export * from './PagesSectionEntries';
export * from './primitives/CollabSearchInput';
export * from '../ui-primitives/EditorHeaderBar';
export * from './primitives/ScopeSummaryHeader';
// `SharedDocsItemMenu` is deliberately not exported: the list lazy-loads it so
// the menu, its move dialog and the rename modal stay out of the docs-ui
// entry's eager graph, which has a gzip budget (see check-production-output).
export * from './SharedDocsListView';
