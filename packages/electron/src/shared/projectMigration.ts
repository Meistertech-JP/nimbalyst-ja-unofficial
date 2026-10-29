export type ProjectMigrationFailure =
  | { code: 'project_directory_missing' }
  | { code: 'project_open' }
  | { code: 'worktrees_exist'; count: number }
  | { code: 'destination_exists' }
  | { code: 'destination_parent_missing' }
  | { code: 'backup_failed'; detail?: string }
  | { code: 'new_name_empty' }
  | { code: 'invalid_name_characters' }
  | { code: 'move_failed'; detail?: string }
  | { code: 'rename_failed'; detail?: string };

export type CanMoveResult =
  | { canMove: true }
  | { canMove: false; reason: ProjectMigrationFailure };

export type MoveResult =
  | { success: true; newPath: string }
  | { success: false; error: ProjectMigrationFailure };
