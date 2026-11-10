export type ProjectMigrationFailure =
  | { code: 'project_directory_missing' }
  | { code: 'project_moving' }
  | { code: 'project_open' }
  | { code: 'worktrees_exist'; count: number }
  | { code: 'destination_exists' }
  | { code: 'destination_parent_missing' }
  | { code: 'destination_worktrees_exists'; detail?: string }
  | { code: 'backup_failed'; detail?: string }
  | { code: 'new_name_empty' }
  | { code: 'invalid_name_characters' }
  | { code: 'move_failed'; detail?: string }
  | { code: 'rename_failed'; detail?: string };

export type CanMoveResult =
  | { canMove: true }
  | { canMove: false; reason: ProjectMigrationFailure };

export type MoveResult =
  | { success: true; newPath: string; warnings?: ProjectMigrationWarning[] }
  | { success: false; error: ProjectMigrationFailure };

export type MoveStartResult =
  | { started: true }
  | { started: false; error: ProjectMigrationFailure };

export interface ProjectMigrationWarning {
  code: 'worktree_repair_failed';
  projectPath: string;
  detail: string;
}
