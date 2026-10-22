import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";
import { createI18nInstance } from "@nimbalyst/i18n/core";
import { UiLanguageProvider } from "@nimbalyst/i18n/react";
import type { ReactElement } from "react";

const { change, cancel } = vi.hoisted(() => ({
  change: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn(),
}));
vi.mock("../../../../store/providerCredentials", async () => {
  const { atom } = await import("jotai");
  return {
    providerCredentialsAtom: atom({
      state: "available",
      credentials: [
        { name: "openai", configured: true },
        { name: "removed-extension", configured: true },
      ],
    }),
    providerCredentialErrorAtom: atom(null),
    refreshProviderCredentials: vi.fn(),
    changeProviderCredential: change,
  };
});
vi.mock("../../../../store/atoms/appSettings", () => ({
  cancelPendingProviderKey: cancel,
  flushPendingAIProviderPersist: vi.fn(),
}));
import { ProviderCredentialsPanel } from "../ProviderCredentialsPanel";

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance("en");
});

function renderWithI18n(
  ui: ReactElement,
  i18n = englishI18n,
  preference: "en" | "ja" = "en"
) {
  return render(
    <UiLanguageProvider
      i18n={i18n}
      preference={preference}
      systemLocale={`${preference}-US`}
    >
      {ui}
    </UiLanguageProvider>
  );
}

it("clears a saved key without enabling a provider and cancels any queued key edit", async () => {
  renderWithI18n(<ProviderCredentialsPanel name="openai" compact />);
  fireEvent.click(screen.getByRole("button", { name: "Clear key" }));
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith("openai", null, {
      workspacePath: undefined,
    })
  );
  expect(cancel).toHaveBeenCalledWith("openai");
  expect(screen.queryByText(/removed-extension/)).toBeNull();
});

it("keeps credentials for removed providers reachable in the full list", () => {
  renderWithI18n(<ProviderCredentialsPanel />);
  expect(screen.getByText("removed-extension — API key saved")).toBeDefined();
});

it("renders saved credentials in Japanese while preserving provider identifiers", async () => {
  const i18n = await createI18nInstance("ja");
  renderWithI18n(<ProviderCredentialsPanel />, i18n, "ja");

  expect(
    screen.getByRole("heading", { name: "保存済みAPIキー" })
  ).toBeDefined();
  expect(screen.getByText("openai — APIキー保存済み")).toBeDefined();
  expect(screen.getAllByText("グローバルキー")).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "キーを消去" })).toHaveLength(2);
  expect(screen.getByText("removed-extension — APIキー保存済み")).toBeDefined();
});
