import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import {
  providerCredentialsAtom,
  providerCredentialErrorAtom,
  refreshProviderCredentials,
  changeProviderCredential,
} from "../../../store/providerCredentials";
import {
  cancelPendingProviderKey,
  flushPendingAIProviderPersist,
} from "../../../store/atoms/appSettings";

/** Saved entries stay reachable even when their provider is disabled/uninstalled. */
export function ProviderCredentialsPanel({
  name,
  compact = false,
}: {
  name?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation("settings");
  const snapshot = useAtomValue(providerCredentialsAtom);
  const error = useAtomValue(providerCredentialErrorAtom);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const translateMessage = (message?: string | null) => {
    switch (message) {
      case "Secure storage is unavailable. Unlock your keychain and retry; API-key authentication is paused.":
        return t("provider_credentials.errors.unavailable");
      case "Credential migration needs attention. API-key authentication is paused; retry or clear the affected key.":
        return t("provider_credentials.errors.migration_pending");
      case "Stored credentials could not be read. Unlock secure storage and retry; existing data has been preserved.":
        return t("provider_credentials.errors.unreadable");
      case "Could not load saved API keys. Retry when secure storage is available.":
        return t("provider_credentials.errors.load_failed");
      case "Could not confirm the API key change. Unlock secure storage, refresh, and retry.":
        return t("provider_credentials.errors.change_failed");
      default:
        return message;
    }
  };
  useEffect(() => {
    void refreshProviderCredentials();
  }, []);
  const entries =
    snapshot?.credentials.filter(
      (c) => !name || (c.name === name && !c.workspacePath)
    ) ?? [];
  const clear = async (credential: (typeof entries)[number]) => {
    const id = JSON.stringify([credential.name, credential.workspacePath]);
    setBusy(id);
    if (!credential.workspacePath) cancelPendingProviderKey(credential.name);
    try {
      await changeProviderCredential(credential.name, null, {
        workspacePath: credential.workspacePath,
      });
      setNotice(
        credential.name === "openai" && !credential.workspacePath
          ? t("provider_credentials.mobile_key_cleared")
          : t("provider_credentials.key_cleared")
      );
    } catch {
      /* The shared error atom exposes the failure. */
    } finally {
      setBusy(null);
    }
  };
  if (
    compact &&
    !entries.length &&
    !error &&
    !notice &&
    snapshot?.state === "available"
  )
    return null;
  return (
    <section className="provider-credentials-panel mb-5 rounded border border-[var(--nim-border)] p-4">
      <h3 className="font-semibold text-[var(--nim-text)]">
        {compact
          ? t("provider_credentials.title_one")
          : t("provider_credentials.title_other")}
      </h3>
      {!compact && (
        <p className="mt-2 text-sm text-[var(--nim-text-muted)]">
          {t("provider_credentials.description")}
        </p>
      )}
      {(error || snapshot?.message) && (
        <p role="alert" className="my-2 text-sm text-[var(--nim-error)]">
          {translateMessage(error || snapshot?.message)}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-sm text-[var(--nim-text-muted)]">
          {notice}
        </p>
      )}
      {(error || snapshot?.state !== "available") && (
        <button
          type="button"
          className="nim-button mt-2"
          onClick={() => {
            void refreshProviderCredentials().then(() =>
              flushPendingAIProviderPersist()
            );
          }}
        >
          {t("provider_credentials.retry")}
        </button>
      )}
      {entries.map((credential) => {
        const id = JSON.stringify([credential.name, credential.workspacePath]);
        return (
          <div
            key={id}
            className="saved-provider-credential flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {t("provider_credentials.key_saved", {
                  provider: credential.name,
                })}
              </p>
              <p className="break-all text-xs text-[var(--nim-text-muted)]">
                {credential.workspacePath
                  ? t("provider_credentials.workspace_key", {
                      path: credential.workspacePath,
                    })
                  : t("provider_credentials.global_key")}
              </p>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              className="nim-button shrink-0"
              onClick={() => {
                void clear(credential);
              }}
            >
              {busy === id
                ? t("provider_credentials.clearing")
                : t("provider_credentials.clear_key")}
            </button>
          </div>
        );
      })}
      {!compact && snapshot?.state === "available" && !entries.length && (
        <p className="mt-3 text-sm text-[var(--nim-text-muted)]">
          {t("provider_credentials.empty")}
        </p>
      )}
    </section>
  );
}
