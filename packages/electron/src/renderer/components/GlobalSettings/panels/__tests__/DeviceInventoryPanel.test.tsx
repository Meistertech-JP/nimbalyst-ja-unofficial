// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import type React from "react";
import { createInstance } from "i18next";
import {
  cleanup,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { resources } from "@nimbalyst/i18n/resources";
import { DeviceInventoryPanel } from "../DeviceInventoryPanel";

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources,
  ns: Object.keys(resources.en),
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

function render(ui: React.ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>,
  });
}

afterEach(async () => {
  cleanup();
  await testI18n.changeLanguage("en");
});
it("hides selected offline devices, restores them, and keeps the rendered account on writes", async () => {
  await testI18nReady;
  let hidden = false;
  const invoke = vi.fn(async (channel, update) => {
    if (channel === "sync:update-devices") hidden = update.hidden;
    return {
      success: true,
      accountId: "account-a",
      inventoryVersion: 1,
      devices: [
        {
          deviceId: "old",
          name: "Previous Mac",
          platform: "macos",
          isOnline: false,
          inventoryHidden: hidden,
        },
        {
          deviceId: "live",
          name: "Live Mac",
          platform: "macos",
          isOnline: true,
        },
      ],
    };
  });
  window.electronAPI = { invoke } as any;
  render(<DeviceInventoryPanel enabled />);
  fireEvent.click(
    await screen.findByRole("checkbox", { name: "Select Previous Mac" })
  );
  expect(
    (
      screen.getByRole("checkbox", {
        name: "Select Live Mac",
      }) as HTMLInputElement
    ).disabled
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Hide selected" }));
  await screen.findByRole("button", { name: "Restore" });
  expect(invoke).toHaveBeenCalledWith("sync:update-devices", {
    accountId: "account-a",
    deviceIds: ["old"],
    hidden: true,
  });
  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull()
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Name for Previous Mac" }),
    { target: { value: "Dev profile" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("sync:update-devices", {
      accountId: "account-a",
      deviceIds: ["old"],
      label: "Dev profile",
    })
  );
});
it("keeps inventory readable when the server lacks mutation support", async () => {
  await testI18nReady;
  window.electronAPI = {
    invoke: vi.fn(async () => ({
      success: true,
      devices: [{ deviceId: "old", name: "Old Mac", isOnline: false }],
    })),
  } as any;
  render(<DeviceInventoryPanel enabled />);
  await screen.findByText("Inventory changes require an updated sync server.");
  expect(screen.queryByRole("button", { name: "Hide" })).toBeNull();
});

it("renders the device inventory in Japanese", async () => {
  await testI18nReady;
  await testI18n.changeLanguage("ja");
  window.electronAPI = { invoke: vi.fn(async () => ({ success: true, inventoryVersion: 1, devices: [] })) } as any;
  render(<DeviceInventoryPanel enabled />);
  expect(await screen.findByRole("heading", { name: "ペアリング済みデバイス" })).toBeTruthy();
  expect(await screen.findByText("ペアリング済みのデバイスはありません。")).toBeTruthy();
});
