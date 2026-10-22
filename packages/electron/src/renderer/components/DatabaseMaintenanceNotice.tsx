import React from "react";
import { useTranslation } from "@nimbalyst/i18n/react";
import { HistoryMigrationWarning } from "./GlobalSettings/panels/database/MigrationProgressViews";
import { useAtomValue } from "jotai";
import { dbMigrationOperationAtom } from "../store/atoms/dbMigration";

/** Mounted once per window; cutover closes the database for every window. */
export function DatabaseMaintenanceNotice(): React.ReactElement | null {
  const { t } = useTranslation('settings', { keyPrefix: 'database_maintenance' });
  const operation = useAtomValue(dbMigrationOperationAtom);
  if (!operation?.requiresRestart) return null;
  const response = operation.response as
    | {
        result?: { historyRowsQuarantined?: number };
        summary?: { historyRowsQuarantined?: number };
      }
    | undefined;
  const ready = operation.status === "awaiting-restart";
  const rollback = operation.kind === "rollback";
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
    >
      <div className="max-w-md rounded-lg p-6 bg-[var(--nim-bg-primary)] text-[var(--nim-text)] shadow-xl">
        <h2 className="text-lg font-semibold mb-2">
          {ready ? t('restart_title') : t('finishing_title')}
        </h2>
        <p>
          {ready
            ? rollback
              ? t('rollback_restart_description')
              : t('restart_description')
            : rollback
              ? t('rollback_progress_description')
              : t('progress_description')}
        </p>
        <HistoryMigrationWarning
          count={
            response?.result?.historyRowsQuarantined ??
            response?.summary?.historyRowsQuarantined
          }
        />
        {ready && (
          <button
            className="setting-button mt-4"
            type="button"
            autoFocus
            onClick={() => {
              void window.electronAPI?.invoke("db:migration:restart");
            }}
          >
            {t('restart_action')}
          </button>
        )}
      </div>
    </div>
  );
}
